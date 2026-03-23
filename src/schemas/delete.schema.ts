import { z } from 'zod';
import { keyValidation } from './upload.schema.js';

/**
 * Valida los params de delete.
 *
 * Campos:
 * - key: clave del objeto a eliminar.
 */
export const deleteKeySchema = z.object({
  key: keyValidation,
});

export type DeleteKeyInput = z.infer<typeof deleteKeySchema>;
