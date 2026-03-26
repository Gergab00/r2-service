import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeMock, mockEnv } = vi.hoisted(() => ({
  executeMock: vi.fn(),
  mockEnv: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'debug',
    API_KEY: '0123456789abcdef0123456789abcdef',
    R2_ACCOUNT_ID: 'test-account-id',
    R2_ACCESS_KEY_ID: 'test-access-key-id',
    R2_SECRET_ACCESS_KEY: 'test-secret-access-key',
    R2_BUCKET_NAME: 'test-bucket',
    PORT: 3000,
    REMOTE_FETCH_ALLOWED_HOSTS: 'allowed.example.com',
    REMOTE_FETCH_ALLOWED_MIME_TYPES: 'image/webp,image/jpeg',
    REMOTE_FETCH_MAX_BYTES: 1024,
    REMOTE_FETCH_TIMEOUT_MS: 1000,
    REMOTE_FETCH_MAX_REDIRECTS: 1,
  },
}));

vi.mock('../../src/config/env.js', () => ({
  env: mockEnv,
}));

vi.mock('../../src/use-cases/ImportFileFromUrlUseCase.js', () => ({
  importFileFromUrlUseCase: {
    execute: executeMock,
  },
}));

import { app } from '../../src/routes/index.js';

describe('POST /api/v1/files/import-from-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe responder 201 cuando el body es válido y el caso de uso termina correctamente', async () => {
    executeMock.mockResolvedValueOnce({
      key: 'imports/file.webp',
      size: 512,
      contentType: 'image/webp',
      uploadedAt: '2026-03-24T17:00:00.000Z',
    });

    const response = await app.request('http://localhost/api/v1/files/import-from-url', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': mockEnv.API_KEY,
      },
      body: JSON.stringify({
        url: 'https://allowed.example.com/file.webp',
        key: 'imports/file.webp',
      }),
    });

    const payload = (await response.json()) as {
      success: boolean;
      data: {
        key: string;
        size: number;
        contentType: string;
        uploadedAt: string;
      };
      timestamp: string;
    };

    expect(response.status).toBe(201);
    expect(payload).toMatchObject({
      success: true,
      data: {
        key: 'imports/file.webp',
        size: 512,
        contentType: 'image/webp',
        uploadedAt: '2026-03-24T17:00:00.000Z',
      },
      timestamp: expect.any(String),
    });
    expect(executeMock).toHaveBeenCalledWith({
      url: 'https://allowed.example.com/file.webp',
      key: 'imports/file.webp',
    });
  });

  it('debe responder 400 cuando el body no es JSON válido', async () => {
    const response = await app.request('http://localhost/api/v1/files/import-from-url', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': mockEnv.API_KEY,
      },
      body: '{"url":',
    });

    const payload = (await response.json()) as {
      code: string;
      message: string;
      details: {
        body: string[];
      };
      timestamp: string;
    };

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'La solicitud contiene datos inválidos.',
      details: {
        body: ['El body de la solicitud debe ser un JSON válido.'],
      },
      timestamp: expect.any(String),
    });
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('debe responder 401 cuando falta la API key', async () => {
    const response = await app.request('http://localhost/api/v1/files/import-from-url', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://allowed.example.com/file.webp',
        key: 'imports/file.webp',
      }),
    });

    const payload = (await response.json()) as {
      code: string;
      message: string;
      timestamp: string;
    };

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'API Key inválida o ausente.',
      timestamp: expect.any(String),
    });
    expect(executeMock).not.toHaveBeenCalled();
  });
});