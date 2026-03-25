import "dotenv/config";

import { serve } from '@hono/node-server';

import { env } from '@config/env.js';
import { logger, toLoggableError } from '@config/logger.js';
import { app } from '@routes/index.js';

/** Entry point del proceso Node.js que inicia el servidor HTTP. */
const exitOnProcessError = (type: 'uncaughtException' | 'unhandledRejection', error: unknown): never => {
  logger.error('process.fatal_error', {
    type,
    error: toLoggableError(error),
  });

  process.exit(1);
};

process.on('uncaughtException', (error: Error): never => exitOnProcessError('uncaughtException', error));
process.on('unhandledRejection', (reason: unknown): never => exitOnProcessError('unhandledRejection', reason));

const server = serve({ fetch: app.fetch, port: env.PORT }, (): void => {
  logger.info('server.started', {
    port: env.PORT,
  });
});

let isShuttingDown = false;

const shutdownGracefully = (signal: NodeJS.Signals): void => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  logger.warn('process.shutdown_started', {
    signal,
  });

  const forceShutdownTimeoutMs = 10000;

  const forceShutdownTimer = setTimeout(() => {
    logger.error('process.shutdown_timeout', {
      signal,
      timeoutMs: forceShutdownTimeoutMs,
    });

    process.exit(1);
  }, forceShutdownTimeoutMs);

  forceShutdownTimer.unref();

  server.close((closeError?: Error) => {
    if (closeError !== undefined) {
      logger.error('process.shutdown_failed', {
        signal,
        error: toLoggableError(closeError),
      });

      process.exit(1);
    }

    logger.info('process.shutdown_completed', {
      signal,
    });

    process.exit(0);
  });
};

process.on('SIGINT', (): void => shutdownGracefully('SIGINT'));
process.on('SIGTERM', (): void => shutdownGracefully('SIGTERM'));