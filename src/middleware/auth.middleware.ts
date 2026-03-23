import { timingSafeEqual } from 'node:crypto';
import type { Context, MiddlewareHandler, Next } from 'hono';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/index.js';

/**
 * Valida la API key de entrada en el header x-api-key antes de permitir
 * que la solicitud continue al resto del pipeline.
 */
export const authMiddleware: MiddlewareHandler = async (
  c: Context,
  next: Next,
): Promise<void> => {
  const apiKeyHeader: string | undefined = c.req.header('x-api-key');

  if (!apiKeyHeader) {
    throw new UnauthorizedError();
  }

  const expectedKeyBuffer: Buffer = Buffer.from(env.API_KEY, 'utf8');
  const receivedKeyBuffer: Buffer = Buffer.from(apiKeyHeader, 'utf8');
  const sameLength: boolean = receivedKeyBuffer.length === expectedKeyBuffer.length;

  // timingSafeEqual requiere buffers del mismo largo; se normaliza el recibido.
  const normalizedReceivedBuffer: Buffer = sameLength
    ? receivedKeyBuffer
    : Buffer.alloc(expectedKeyBuffer.length);

  const isValidApiKey: boolean =
    timingSafeEqual(normalizedReceivedBuffer, expectedKeyBuffer) && sameLength;

  if (!isValidApiKey) {
    throw new UnauthorizedError();
  }

  await next();
};
