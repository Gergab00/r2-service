import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'debug',
  },
}));

vi.mock('../../src/config/env.js', () => ({
  env: mockEnv,
}));

import { R2UploadError, ValidationError } from '../../src/errors/index.js';
import { errorMiddleware } from '../../src/middleware/error.middleware.js';
import { requestContextMiddleware } from '../../src/middleware/request-context.middleware.js';

describe('errorMiddleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('debe registrar cause anidado para AppError 500 y responder código de dominio', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((): void => {});

    const app = new Hono();

    app.use('*', requestContextMiddleware);
    app.get('/upload-failure', () => {
      throw new R2UploadError('docs/file.pdf', new Error('R2 rejected object'));
    });
    app.onError(errorMiddleware);

    const response = await app.request('http://localhost/upload-failure', {
      method: 'GET',
      headers: {
        'x-request-id': 'req-app-500',
      },
    });

    const payload = (await response.json()) as {
      code: string;
      message: string;
      timestamp: string;
    };

    const firstErrorCall = errorSpy.mock.calls[0]?.[0];
    const firstErrorEntry = JSON.parse(String(firstErrorCall)) as {
      message: string;
      requestId: string;
      code: string;
      statusCode: number;
      error: {
        name: string;
        message: string;
        cause: {
          name: string;
          message: string;
        };
      };
    };

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      code: 'R2_UPLOAD_FAILED',
      message: "No se pudo subir el archivo 'docs/file.pdf' a R2.",
      timestamp: expect.any(String),
    });
    expect(firstErrorEntry).toMatchObject({
      message: 'request.app_error',
      requestId: 'req-app-500',
      code: 'R2_UPLOAD_FAILED',
      statusCode: 500,
      error: {
        name: 'R2UploadError',
        message: "No se pudo subir el archivo 'docs/file.pdf' a R2.",
        cause: {
          name: 'Error',
          message: 'R2 rejected object',
        },
      },
    });
  });

  it('debe registrar ValidationError con nivel warn y responder 400', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((): void => {});

    const app = new Hono();

    app.use('*', requestContextMiddleware);
    app.get('/invalid-input', () => {
      throw new ValidationError({ body: ['invalid payload'] });
    });
    app.onError(errorMiddleware);

    const response = await app.request('http://localhost/invalid-input', {
      method: 'GET',
      headers: {
        'x-request-id': 'req-validation-400',
      },
    });

    const payload = (await response.json()) as {
      code: string;
      message: string;
      details: {
        body: string[];
      };
      timestamp: string;
    };

    const firstWarnCall = warnSpy.mock.calls[0]?.[0];
    const firstWarnEntry = JSON.parse(String(firstWarnCall)) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'La solicitud contiene datos inválidos.',
      details: {
        body: ['invalid payload'],
      },
      timestamp: expect.any(String),
    });
    expect(firstWarnEntry).toMatchObject({
      message: 'request.validation_error',
      requestId: 'req-validation-400',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  });
});
