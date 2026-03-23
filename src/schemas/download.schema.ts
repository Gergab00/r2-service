import { z } from 'zod';
import { keyValidation } from './upload.schema.js';

/**
 * Valida los params de download.
 *
 * Campos:
 * - key: clave del objeto a descargar.
 */
export const downloadKeySchema = z.object({
  key: keyValidation,
});

export type DownloadKeyInput = z.infer<typeof downloadKeySchema>;
