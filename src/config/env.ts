import { z } from 'zod';

const envSchema = z.object({
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_KEY: z.string().min(32),
  REMOTE_FETCH_ALLOWED_HOSTS: z.string().min(1),
  REMOTE_FETCH_ALLOWED_MIME_TYPES: z.string().min(1),
  REMOTE_FETCH_MAX_BYTES: z.coerce.number().int().positive(),
  REMOTE_FETCH_TIMEOUT_MS: z.coerce.number().int().positive(),
  REMOTE_FETCH_MAX_REDIRECTS: z.coerce.number().int().nonnegative(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Configuracion de entorno del servicio validada al arranque.
 *
 * Este modulo es el unico punto de acceso a variables de entorno.
 * Si alguna variable requerida falta o es invalida, Zod lanza un error
 * y el proceso se detiene durante la inicializacion.
 */
export const env: Env = envSchema.parse(process.env);