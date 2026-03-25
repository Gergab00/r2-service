import type { Context, ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';

import { logger, toLoggableError } from '@config/logger.js';

import { AppError, ValidationError } from '../errors/index.js';
import { getRequestIdFromContext } from './request-context.middleware.js';

/**
 * Maneja errores HTTP de forma centralizada para evitar exponer detalles
 * internos y mantener respuestas consistentes.
 */
export const errorMiddleware: ErrorHandler = (
  error: Error,
  c: Context,
): Response => {
  const timestamp: string = new Date().toISOString();
  const requestId: string | null = getRequestIdFromContext(c);

  const baseErrorLog = {
    requestId,
    method: c.req.method,
    path: c.req.path,
  };

  if (error instanceof ValidationError) {
    logger.warn('request.validation_error', {
      ...baseErrorLog,
      code: error.code,
      statusCode: 400,
      details: error.details,
      error: toLoggableError(error),
    });

    return c.json(
      {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp,
      },
      400,
    );
  }

  if (error instanceof AppError) {
    const statusCode: ContentfulStatusCode = error.statusCode as ContentfulStatusCode;
    const appErrorLogFields = {
      ...baseErrorLog,
      code: error.code,
      statusCode: error.statusCode,
      error: toLoggableError(error),
    };

    if (error.statusCode >= 500) {
      logger.error('request.app_error', appErrorLogFields);
    } else {
      logger.warn('request.app_error', appErrorLogFields);
    }

    return c.json(
      {
        code: error.code,
        message: error.message,
        timestamp,
      },
      statusCode,
    );
  }

  if (error instanceof ZodError) {
    logger.warn('request.zod_error', {
      ...baseErrorLog,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: error.flatten(),
      error: toLoggableError(error),
    });

    return c.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Error de validación',
        details: error.flatten(),
        timestamp,
      },
      400,
    );
  }

  logger.error('request.unhandled_error', {
    ...baseErrorLog,
    code: 'INTERNAL_ERROR',
    statusCode: 500,
    error: toLoggableError(error),
  });

  return c.json(
    {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor.',
      timestamp,
    },
    500,
  );
};
