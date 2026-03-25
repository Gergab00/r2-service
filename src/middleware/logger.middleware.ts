import type { Context, MiddlewareHandler, Next } from 'hono';
import { logger, type LogLevel } from '@config/logger.js';
import { getRequestIdFromContext } from './request-context.middleware.js';

const pickLevelByStatusCode = (statusCode: number): LogLevel => {
  if (statusCode >= 500) {
    return 'error';
  }

  if (statusCode >= 400) {
    return 'warn';
  }

  return 'info';
};

/**
 * Registra de manera estructurada la entrada y salida de cada request,
 * incluyendo estado final y duracion total en milisegundos.
 */
export const loggerMiddleware: MiddlewareHandler = async (
  c: Context,
  next: Next,
): Promise<void> => {
  const method = c.req.method;
  const path = c.req.path;
  const requestId = getRequestIdFromContext(c);
  const userAgent = c.req.header('user-agent') ?? null;
  const forwardedFor = c.req.header('x-forwarded-for') ?? null;
  const startedAtMs: number = Date.now();

  const requestLogger = logger.child({
    requestId,
    method,
    path,
  });

  requestLogger.debug('request.start', {
    userAgent,
    forwardedFor,
  });

  try {
    await next();
  } finally {
    const status = c.res.status;
    const durationMs: number = Date.now() - startedAtMs;
    const responseSizeBytesHeader = c.res.headers.get('content-length');
    const responseSizeBytes =
      responseSizeBytesHeader === null ? null : Number.parseInt(responseSizeBytesHeader, 10);

    const level = pickLevelByStatusCode(status);
    const responseLogFields = {
      status,
      durationMs,
      responseSizeBytes: Number.isFinite(responseSizeBytes) ? responseSizeBytes : null,
    };

    if (level === 'error') {
      requestLogger.error('request.end', responseLogFields);
      return;
    }

    if (level === 'warn') {
      requestLogger.warn('request.end', responseLogFields);
      return;
    }

    requestLogger.info('request.end', responseLogFields);
  }
};
