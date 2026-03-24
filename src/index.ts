import "dotenv/config";

import { serve } from '@hono/node-server';

import { env } from '@config/env.js';
import { app } from '@routes/index.js';

/** Entry point del proceso Node.js que inicia el servidor HTTP. */
const exitOnProcessError = (type: 'uncaughtException' | 'unhandledRejection', error: unknown): never => {
  const errorDetails: unknown = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;
  console.error(JSON.stringify({ level: 'error', message: type, error: errorDetails, timestamp: new Date().toISOString() }));
  process.exit(1);
};

process.on('uncaughtException', (error: Error): never => exitOnProcessError('uncaughtException', error));
process.on('unhandledRejection', (reason: unknown): never => exitOnProcessError('unhandledRejection', reason));

serve({ fetch: app.fetch, port: env.PORT }, (): void => {
  console.log(
    JSON.stringify({
      level: 'info',
      message: 'r2-service running',
      port: env.PORT,
      env: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    }),
  );
});