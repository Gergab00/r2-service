import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'debug',
  },
}));

vi.mock('../../src/config/env.js', () => ({
  env: mockEnv,
}));

import { loggerMiddleware } from '../../src/middleware/logger.middleware.js';
import { requestContextMiddleware } from '../../src/middleware/request-context.middleware.js';

describe('loggerMiddleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe registrar request.end con requestId y métricas para respuesta exitosa', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation((): void => {});
    vi.spyOn(console, 'debug').mockImplementation((): void => {});

    const app = new Hono();

    app.use('*', requestContextMiddleware);
    app.use('*', loggerMiddleware);

    app.get('/ok', (c) => c.json({ ok: true }, 200));

    const response = await app.request('http://localhost/ok', {
      method: 'GET',
      headers: {
        'x-request-id': 'req-123',
      },
    });

    const firstInfoCall = infoSpy.mock.calls[0]?.[0];
    const firstInfoEntry = JSON.parse(String(firstInfoCall)) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('req-123');
    expect(firstInfoEntry).toMatchObject({
      level: 'info',
      message: 'request.end',
      method: 'GET',
      path: '/ok',
      status: 200,
      requestId: 'req-123',
      durationMs: expect.any(Number),
    });
  });

  it('debe registrar request.end como error cuando la respuesta termina con 500', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((): void => {});
    vi.spyOn(console, 'debug').mockImplementation((): void => {});

    const app = new Hono();

    app.use('*', requestContextMiddleware);
    app.use('*', loggerMiddleware);

    app.get('/boom', () => {
      throw new Error('boom');
    });

    app.onError((_error, c) => c.json({ code: 'INTERNAL_ERROR' }, 500));

    const response = await app.request('http://localhost/boom', {
      method: 'GET',
      headers: {
        'x-request-id': 'req-500',
      },
    });

    const firstErrorCall = errorSpy.mock.calls[0]?.[0];
    const firstErrorEntry = JSON.parse(String(firstErrorCall)) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(firstErrorEntry).toMatchObject({
      level: 'error',
      message: 'request.end',
      method: 'GET',
      path: '/boom',
      status: 500,
      requestId: 'req-500',
      durationMs: expect.any(Number),
    });
  });
});
