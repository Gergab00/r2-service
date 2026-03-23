import { type Context, Hono } from 'hono';

type HealthResponse = {
  status: 'ok';
  service: 'r2-service';
  timestamp: string;
};

const healthRoutes: Hono = new Hono();

/**
 * GET /health
 *
 * Expone estado de disponibilidad del servicio sin requerir autenticacion.
 */
const healthCheckHandler = (c: Context): Response => {
  const response: HealthResponse = {
    status: 'ok',
    service: 'r2-service',
    timestamp: new Date().toISOString(),
  };

  return c.json(response, 200);
};

healthRoutes.get('/health', healthCheckHandler);

export { healthRoutes };
