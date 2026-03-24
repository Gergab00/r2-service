import { z } from 'zod';

import { keyValidation } from './upload.schema.js';

/**
 * Valida el body JSON del endpoint de importación remota por URL.
 *
 * Campos:
 * - url: URL pública del recurso a importar. Debe ser HTTP o HTTPS.
 * - key: clave destino del objeto en R2. Sigue las mismas reglas que el upload.
 */
export const importFromUrlBodySchema = z.object({
  url: z
    .string({ error: 'El campo url es obligatorio.' })
    .url('El campo url debe ser una URL válida.')
    .refine(
      (url: string) => url.startsWith('http://') || url.startsWith('https://'),
      'El campo url debe usar el esquema http o https.',
    ),
  key: keyValidation,
});

export type ImportFromUrlBodyInput = z.infer<typeof importFromUrlBodySchema>;
