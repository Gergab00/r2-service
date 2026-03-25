import { randomUUID } from 'node:crypto';

import type { Context, MiddlewareHandler, Next } from 'hono';

export const REQUEST_ID_HEADER_NAME = 'x-request-id';
export const REQUEST_ID_CONTEXT_KEY = 'requestId';

const parseIncomingRequestId = (value: string | undefined): string | null => {
  if (value === undefined) {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  return trimmedValue;
};

export const getRequestIdFromContext = (c: Context): string | null => {
  const requestId: unknown = c.get(REQUEST_ID_CONTEXT_KEY);

  if (typeof requestId !== 'string' || requestId.length === 0) {
    return null;
  }

  return requestId;
};

export const requestContextMiddleware: MiddlewareHandler = async (
  c: Context,
  next: Next,
): Promise<void> => {
  const incomingRequestId: string | null = parseIncomingRequestId(c.req.header(REQUEST_ID_HEADER_NAME));
  const requestId: string = incomingRequestId ?? randomUUID();

  c.set(REQUEST_ID_CONTEXT_KEY, requestId);
  c.header(REQUEST_ID_HEADER_NAME, requestId);

  await next();
};