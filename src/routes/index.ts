import { type Context, Hono, type Next } from 'hono';

import { authMiddleware, errorMiddleware, loggerMiddleware } from '../middleware/index.js';
import { filesRoutes } from './files.routes.js';
import { healthRoutes } from './health.routes.js';

const app: Hono = new Hono();

app.use('*', loggerMiddleware);
app.use('*', async (c: Context, next: Next): Promise<void> => {
  const path: string = c.req.path;

  if (path === '/health' || path === '/health/') {
    await next();
    return;
  }

  await authMiddleware(c, next);
});

app.route('/', healthRoutes);
app.route('/api/v1', filesRoutes);

app.onError(errorMiddleware);

export { app };
