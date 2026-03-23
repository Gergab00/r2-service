import { z } from 'zod';

/**
 * Valida la clave (key) de un objeto en R2.
 *
 * Reglas:
 * - Longitud entre 1 y 512 caracteres.
 * - Solo permite letras, numeros, guion (-), guion bajo (_), barra (/), y punto (.).
 * - No permite secuencias de path traversal ("..").
 */
export const keyValidation = z
  .string()
  .min(1, 'La clave no puede estar vacia.')
  .max(512, 'La clave no puede exceder 512 caracteres.')
  .regex(
    /^[A-Za-z0-9/_.-]+$/,
    'La clave solo puede contener letras, numeros, guiones, guiones_bajos, barras y puntos.',
  )
  .refine((key: string) => !key.includes('..'), {
    message: 'La clave no puede contener "..".',
  });

/**
 * Valida los params de upload.
 *
 * Campos:
 * - key: clave del objeto a subir.
 */
export const uploadKeySchema = z.object({
  key: keyValidation,
});

/**
 * Valida la query de upload.
 *
 * Campos:
 * - contentType: MIME type del archivo (por defecto application/octet-stream).
 */
export const uploadQuerySchema = z.object({
  contentType: z.string().default('application/octet-stream'),
});

export type UploadKeyInput = z.infer<typeof uploadKeySchema>;
export type UploadQueryInput = z.infer<typeof uploadQuerySchema>;
