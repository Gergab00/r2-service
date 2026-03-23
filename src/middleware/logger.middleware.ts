import type { Context, MiddlewareHandler, Next } from 'hono';

type LoggerLevel = 'info';

type LoggerEntry = {
  level: LoggerLevel;
  method: string;
  path: string;
  status: number | null;
  durationMs: number | null;
  timestamp: string;
};

/**
 * Registra de manera estructurada la entrada y salida de cada request,
 * incluyendo estado final y duracion total en milisegundos.
 */
export const loggerMiddleware: MiddlewareHandler = async (
  c: Context,
  next: Next,
): Promise<void> => {
  const startTimestamp: string = new Date().toISOString();
  const method: string = c.req.method;
  const path: string = c.req.path;
  const startedAtMs: number = Date.now();

  const requestLog: LoggerEntry = {
    level: 'info',
    method,
    path,
    status: null,
    durationMs: null,
    timestamp: startTimestamp,
  };

  console.log(JSON.stringify(requestLog));

  try {
    await next();
  } finally {
    const durationMs: number = Date.now() - startedAtMs;

    const responseLog: LoggerEntry = {
      level: 'info',
      method,
      path,
      status: c.res.status,
      durationMs,
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify(responseLog));
  }
};
