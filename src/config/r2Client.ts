import { S3Client } from '@aws-sdk/client-s3';

import { env } from '@config/env.js';

/**
 * Cliente singleton de Cloudflare R2 basado en S3.
 *
 * Esta instancia unica se reutiliza en toda la aplicacion para ejecutar
 * operaciones sobre el bucket sin recrear clientes por solicitud.
 */
export const r2Client: S3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});