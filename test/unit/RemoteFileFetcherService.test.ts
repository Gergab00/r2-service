/// <reference types="node" />

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RemoteFetchHostNotAllowedError,
  RemoteFetchMimeTypeNotAllowedError,
  RemoteFetchSizeLimitExceededError,
  RemoteFetchSsrfError,
} from '../../src/errors/index.js';
import { RemoteFileFetcherService } from '../../src/services/RemoteFileFetcherService.js';

const { lookupMock, fetchMock, mockEnv } = vi.hoisted(() => ({
  lookupMock: vi.fn(),
  fetchMock: vi.fn(),
  mockEnv: {
    REMOTE_FETCH_ALLOWED_HOSTS: 'allowed.example.com,cdn.example.com',
    REMOTE_FETCH_ALLOWED_MIME_TYPES: 'image/webp,text/plain',
    REMOTE_FETCH_MAX_BYTES: 5,
    REMOTE_FETCH_TIMEOUT_MS: 1_000,
    REMOTE_FETCH_MAX_REDIRECTS: 1,
  },
}));

vi.mock('node:dns/promises', () => ({
  lookup: lookupMock,
}));

vi.mock('@config/env.js', () => ({
  env: mockEnv,
}));

describe('RemoteFileFetcherService > downloadFile', () => {
  let service: RemoteFileFetcherService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);

    mockEnv.REMOTE_FETCH_ALLOWED_HOSTS = 'allowed.example.com,cdn.example.com';
    mockEnv.REMOTE_FETCH_ALLOWED_MIME_TYPES = 'image/webp,text/plain';
    mockEnv.REMOTE_FETCH_MAX_BYTES = 5;
    mockEnv.REMOTE_FETCH_TIMEOUT_MS = 1_000;
    mockEnv.REMOTE_FETCH_MAX_REDIRECTS = 1;

    service = new RemoteFileFetcherService();
  });

  it('debe bloquear hosts fuera de la allowlist', async () => {
    const downloadPromise = service.downloadFile('https://evil.example.com/file.webp');

    await expect(downloadPromise).rejects.toBeInstanceOf(RemoteFetchHostNotAllowedError);
    expect(lookupMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('debe bloquear hosts cuyo DNS resuelve a IP privada', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '127.0.0.1' }]);

    const downloadPromise = service.downloadFile('https://allowed.example.com/file.webp');

    await expect(downloadPromise).rejects.toBeInstanceOf(RemoteFetchSsrfError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('debe rechazar content-types fuera de la allowlist', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34' }]);
    fetchMock.mockResolvedValueOnce(
      new Response('html', {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      }),
    );

    const downloadPromise = service.downloadFile('https://allowed.example.com/file.html');

    await expect(downloadPromise).rejects.toBeInstanceOf(RemoteFetchMimeTypeNotAllowedError);
  });

  it('debe rechazar cuerpos que exceden el tamaño máximo permitido', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34' }]);
    fetchMock.mockResolvedValueOnce(
      new Response(Uint8Array.from([1, 2, 3, 4, 5, 6]), {
        status: 200,
        headers: {
          'content-type': 'image/webp',
        },
      }),
    );

    const downloadPromise = service.downloadFile('https://allowed.example.com/file.webp');

    await expect(downloadPromise).rejects.toBeInstanceOf(RemoteFetchSizeLimitExceededError);
  });

  it('debe bloquear redirects hacia hosts no permitidos', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34' }]);
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: 'https://evil.example.com/file.webp',
        },
      }),
    );

    const downloadPromise = service.downloadFile('https://allowed.example.com/file.webp');

    await expect(downloadPromise).rejects.toBeInstanceOf(RemoteFetchHostNotAllowedError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('debe descargar y retornar buffer con metadatos cuando la respuesta es válida', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34' }]);
    fetchMock.mockResolvedValueOnce(
      new Response('hello', {
        status: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'content-length': '5',
        },
      }),
    );

    const result = await service.downloadFile('https://allowed.example.com/file.txt');

    expect(result).toEqual({
      buffer: Buffer.from('hello'),
      contentType: 'text/plain',
      finalUrl: 'https://allowed.example.com/file.txt',
      size: 5,
    });
    expect(lookupMock).toHaveBeenCalledWith('allowed.example.com', { all: true, verbatim: true });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: 'GET',
        redirect: 'manual',
      }),
    );
  });
});