import { z } from 'zod';

import { keyValidation } from './upload.schema.js';

const SIGNED_URL_MIN_EXPIRES_IN_SECONDS: number = 60;
const SIGNED_URL_MAX_EXPIRES_IN_SECONDS: number = 3600;
const SIGNED_URL_DEFAULT_EXPIRES_IN_SECONDS: number = 900;

/**
 * Valida el body del endpoint para generar URL firmada temporal de descarga.
 *
 * Campos:
 * - key: clave del objeto en R2.
 * - expiresIn: tiempo de expiracion en segundos.
 */
export const signedUrlBodySchema = z.object({
  key: keyValidation,
  expiresIn: z
    .coerce
    .number()
    .int('expiresIn debe ser un numero entero en segundos.')
    .min(
      SIGNED_URL_MIN_EXPIRES_IN_SECONDS,
      `expiresIn debe ser mayor o igual a ${SIGNED_URL_MIN_EXPIRES_IN_SECONDS} segundos.`,
    )
    .max(
      SIGNED_URL_MAX_EXPIRES_IN_SECONDS,
      `expiresIn debe ser menor o igual a ${SIGNED_URL_MAX_EXPIRES_IN_SECONDS} segundos.`,
    )
    .default(SIGNED_URL_DEFAULT_EXPIRES_IN_SECONDS),
});

export type SignedUrlBodyInput = z.infer<typeof signedUrlBodySchema>;
