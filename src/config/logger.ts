import { env } from './env.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogFields = Record<string, unknown>;

const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const BASE_LOG_FIELDS: Readonly<LogFields> = {
  service: 'r2-service',
  env: env.NODE_ENV,
};

const MAX_ERROR_CAUSE_DEPTH = 3;

const canLog = (level: LogLevel): boolean => {
  return LOG_PRIORITY[level] >= LOG_PRIORITY[env.LOG_LEVEL];
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
};

const serializeError = (error: unknown, depth = 0): unknown => {
  if (depth > MAX_ERROR_CAUSE_DEPTH) {
    return { message: 'error cause depth exceeded' };
  }

  if (error instanceof Error) {
    const source: Record<string, unknown> = asRecord(error);

    const serialized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    if (typeof error.stack === 'string') {
      serialized.stack = error.stack;
    }

    if (typeof source.code === 'string') {
      serialized.code = source.code;
    }

    if (typeof source.statusCode === 'number') {
      serialized.statusCode = source.statusCode;
    }

    if ('cause' in source && source.cause !== undefined) {
      serialized.cause = serializeError(source.cause, depth + 1);
    }

    return serialized;
  }

  if (error === null || typeof error !== 'object') {
    return error;
  }

  return asRecord(error);
};

const emitLog = (
  level: LogLevel,
  message: string,
  fields: LogFields,
  context: LogFields,
): void => {
  if (!canLog(level)) {
    return;
  }

  const entry: LogFields = {
    ...BASE_LOG_FIELDS,
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
    ...fields,
  };

  const payload = JSON.stringify(entry);

  if (level === 'error') {
    console.error(payload);
    return;
  }

  if (level === 'warn') {
    console.warn(payload);
    return;
  }

  if (level === 'debug') {
    console.debug(payload);
    return;
  }

  console.info(payload);
};

export type AppLogger = {
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
  child: (fields: LogFields) => AppLogger;
};

const createLogger = (context: LogFields = {}): AppLogger => {
  return {
    debug: (message: string, fields: LogFields = {}): void => {
      emitLog('debug', message, fields, context);
    },
    info: (message: string, fields: LogFields = {}): void => {
      emitLog('info', message, fields, context);
    },
    warn: (message: string, fields: LogFields = {}): void => {
      emitLog('warn', message, fields, context);
    },
    error: (message: string, fields: LogFields = {}): void => {
      emitLog('error', message, fields, context);
    },
    child: (fields: LogFields): AppLogger => {
      return createLogger({ ...context, ...fields });
    },
  };
};

export const toLoggableError = (error: unknown): unknown => serializeError(error);

export const logger: AppLogger = createLogger();