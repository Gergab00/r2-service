import { z } from 'zod';

/**
 * Valida la query de listado de objetos.
 *
 * Campos:
 * - prefix: prefijo opcional para filtrar claves.
 * - limit: cantidad maxima de resultados (1-1000, por defecto 100).
 * - cursor: cursor opcional para paginacion.
 */
export const listQuerySchema = z.object({
  prefix: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  cursor: z.string().optional(),
});

export type ListQueryInput = z.infer<typeof listQuerySchema>;
