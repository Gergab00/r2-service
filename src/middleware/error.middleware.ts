import type { Context, ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import { AppError } from '../errors/index.js';

/**
 * Maneja errores HTTP de forma centralizada para evitar exponer detalles
 * internos y mantener respuestas consistentes.
 */
export const errorMiddleware: ErrorHandler = (
  error: Error,
  c: Context,
): Response => {
  const timestamp: string = new Date().toISOString();

  if (error instanceof AppError) {
    const statusCode: ContentfulStatusCode = error.statusCode as ContentfulStatusCode;

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

  console.error('Unhandled error in request pipeline', {
    name: error.name,
    message: error.message,
    timestamp,
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
