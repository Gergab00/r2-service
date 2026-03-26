import { beforeEach, describe, expect, it, vi } from 'vitest';

import { R2NotFoundError } from '../../src/errors/index.js';

const { getDownloadSignedUrlMock, mockEnv } = vi.hoisted(() => ({
  getDownloadSignedUrlMock: vi.fn(),
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

vi.mock('../../src/services/R2Service.js', () => ({
  r2Service: {
    uploadFile: vi.fn(),
    getFile: vi.fn(),
    deleteFile: vi.fn(),
    listFiles: vi.fn(),
    getDownloadSignedUrl: getDownloadSignedUrlMock,
  },
}));

import { app } from '../../src/routes/index.js';

describe('POST /api/v1/files/signed-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe responder 200 cuando la solicitud es valida', async () => {
    getDownloadSignedUrlMock.mockResolvedValueOnce({
      signedUrl: 'https://signed.example.com/object?X-Amz-Expires=900',
      expiresIn: 900,
      expiresAt: '2026-03-26T18:00:00.000Z',
    });

    const response = await app.request('http://localhost/api/v1/files/signed-url', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': mockEnv.API_KEY,
      },
      body: JSON.stringify({
        key: 'private/folder/document.pdf',
        expiresIn: 900,
      }),
    });

    const payload = (await response.json()) as {
      success: boolean;
      data: {
        signedUrl: string;
        expiresIn: number;
        expiresAt: string;
      };
      timestamp: string;
    };

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: {
        signedUrl: 'https://signed.example.com/object?X-Amz-Expires=900',
        expiresIn: 900,
        expiresAt: '2026-03-26T18:00:00.000Z',
      },
      timestamp: expect.any(String),
    });
    expect(getDownloadSignedUrlMock).toHaveBeenCalledWith('private/folder/document.pdf', 900);
  });

  it('debe responder 401 cuando falta x-api-key', async () => {
    const response = await app.request('http://localhost/api/v1/files/signed-url', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        key: 'private/folder/document.pdf',
        expiresIn: 900,
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
    expect(getDownloadSignedUrlMock).not.toHaveBeenCalled();
  });

  it('debe responder 400 cuando expiresIn esta fuera de rango', async () => {
    const response = await app.request('http://localhost/api/v1/files/signed-url', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': mockEnv.API_KEY,
      },
      body: JSON.stringify({
        key: 'private/folder/document.pdf',
        expiresIn: 10,
      }),
    });

    const payload = (await response.json()) as {
      code: string;
      message: string;
      details: unknown;
      timestamp: string;
    };

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Error de validación',
      timestamp: expect.any(String),
    });
    expect(payload.details).toBeDefined();
    expect(getDownloadSignedUrlMock).not.toHaveBeenCalled();
  });

  it('debe responder 404 cuando el archivo no existe', async () => {
    getDownloadSignedUrlMock.mockRejectedValueOnce(new R2NotFoundError('private/folder/missing.pdf'));

    const response = await app.request('http://localhost/api/v1/files/signed-url', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': mockEnv.API_KEY,
      },
      body: JSON.stringify({
        key: 'private/folder/missing.pdf',
        expiresIn: 900,
      }),
    });

    const payload = (await response.json()) as {
      code: string;
      message: string;
      timestamp: string;
    };

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      code: 'R2_NOT_FOUND',
      message: "El archivo 'private/folder/missing.pdf' no existe en R2.",
      timestamp: expect.any(String),
    });
  });
});
