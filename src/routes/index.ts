import { Hono } from 'hono';

import { env } from '../config/env.js';
import { authMiddleware, errorMiddleware, loggerMiddleware } from '../middleware/index.js';
import { docsRoutes } from './docs.routes.js';
import { filesRoutes } from './files.routes.js';
import { healthRoutes } from './health.routes.js';

const app: Hono = new Hono();

app.use('*', loggerMiddleware);
// Only expose API docs outside production environments.
if (env.NODE_ENV !== 'production') app.route('/', docsRoutes);

app.route('/', healthRoutes);
app.use('/api/*', authMiddleware);
app.route('/api/v1', filesRoutes);

app.onError(errorMiddleware);

export { app };
