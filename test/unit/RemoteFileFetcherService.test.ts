/// <reference types="node" />

import { Readable } from 'node:stream';
import type http from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RemoteFetchHostNotAllowedError,
  RemoteFetchMimeTypeNotAllowedError,
  RemoteFetchSizeLimitExceededError,
  RemoteFetchSsrfError,
} from '../../src/errors/index.js';
import { RemoteFileFetcherService } from '../../src/services/RemoteFileFetcherService.js';

const { lookupMock, httpsRequestMock, mockEnv } = vi.hoisted(() => ({
  lookupMock: vi.fn(),
  httpsRequestMock: vi.fn(),
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

vi.mock('node:https', () => ({
  default: { request: httpsRequestMock },
  request: httpsRequestMock,
}));

vi.mock('@config/env.js', () => ({
  env: mockEnv,
}));

/**
 * Construye un mock de IncomingMessage a partir de opciones simples.
 * El Readable subyacente emite los chunks del body y termina inmediatamente.
 */
function createMockIncomingMessage(options: {
  statusCode: number;
  statusMessage?: string;
  headers: Record<string, string | string[]>;
  body?: string | null;
}): http.IncomingMessage {
  const body = options.body ?? null;
  const chunks = body !== null ? [Buffer.from(body)] : [];
  const readable = Readable.from(chunks);

  return Object.assign(readable, {
    statusCode: options.statusCode,
    statusMessage: options.statusMessage ?? (options.statusCode >= 200 && options.statusCode < 300 ? 'OK' : 'Error'),
    headers: options.headers,
  }) as unknown as http.IncomingMessage;
}

/**
 * Configura `httpsRequestMock` para devolver una respuesta simulada la próxima
 * vez que sea invocado. El callback de respuesta se dispara en `req.end()`.
 */
function mockNextHttpsResponse(options: {
  statusCode: number;
  statusMessage?: string;
  headers: Record<string, string | string[]>;
  body?: string | null;
}): void {
  httpsRequestMock.mockImplementationOnce(
    (_reqOptions: http.RequestOptions, callback: (res: http.IncomingMessage) => void) => {
      const res = createMockIncomingMessage(options);
      const mockReq = {
        once: vi.fn().mockReturnThis(),
        end: vi.fn().mockImplementation(() => {
          callback(res);
        }),
      };
      return mockReq;
    },
  );
}

describe('RemoteFileFetcherService > downloadFile', () => {
  let service: RemoteFileFetcherService;

  beforeEach(() => {
    vi.clearAllMocks();

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
    expect(httpsRequestMock).not.toHaveBeenCalled();
  });

  it('debe bloquear hosts cuyo DNS resuelve a IP privada', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);

    const downloadPromise = service.downloadFile('https://allowed.example.com/file.webp');

    await expect(downloadPromise).rejects.toBeInstanceOf(RemoteFetchSsrfError);
    expect(httpsRequestMock).not.toHaveBeenCalled();
  });

  it('debe rechazar content-types fuera de la allowlist', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]);
    mockNextHttpsResponse({
      statusCode: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: 'html',
    });

    const downloadPromise = service.downloadFile('https://allowed.example.com/file.html');

    await expect(downloadPromise).rejects.toBeInstanceOf(RemoteFetchMimeTypeNotAllowedError);
  });

  it('debe rechazar cuerpos que exceden el tamaño máximo permitido', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]);
    mockNextHttpsResponse({
      statusCode: 200,
      headers: { 'content-type': 'image/webp' },
      body: '\x01\x02\x03\x04\x05\x06', // 6 bytes > maxBytes(5)
    });

    const downloadPromise = service.downloadFile('https://allowed.example.com/file.webp');

    await expect(downloadPromise).rejects.toBeInstanceOf(RemoteFetchSizeLimitExceededError);
  });

  it('debe bloquear redirects hacia hosts no permitidos', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]);
    mockNextHttpsResponse({
      statusCode: 302,
      statusMessage: 'Found',
      headers: { location: 'https://evil.example.com/file.webp' },
      body: null,
    });

    const downloadPromise = service.downloadFile('https://allowed.example.com/file.webp');

    await expect(downloadPromise).rejects.toBeInstanceOf(RemoteFetchHostNotAllowedError);
    expect(httpsRequestMock).toHaveBeenCalledTimes(1);
  });

  it('debe descargar y retornar buffer con metadatos cuando la respuesta es válida', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]);
    mockNextHttpsResponse({
      statusCode: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'content-length': '5' },
      body: 'hello',
    });

    const result = await service.downloadFile('https://allowed.example.com/file.txt');

    expect(result).toEqual({
      buffer: Buffer.from('hello'),
      contentType: 'text/plain',
      finalUrl: 'https://allowed.example.com/file.txt',
      size: 5,
    });
    expect(lookupMock).toHaveBeenCalledWith('allowed.example.com', { all: true, verbatim: true });
    expect(httpsRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'allowed.example.com',
        method: 'GET',
        path: '/file.txt',
      }),
      expect.any(Function),
    );
    // Verifica que la función lookup personalizada esté presente (IP pinning anti-rebinding)
    const callOptions = httpsRequestMock.mock.calls[0]?.[0] as http.RequestOptions;
    expect(typeof callOptions.lookup).toBe('function');
  });
});