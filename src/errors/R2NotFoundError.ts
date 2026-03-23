import { AppError } from './AppError.js';

/**
 * Se lanza cuando se intenta recuperar o inspeccionar un objeto que no existe en R2.
 */
export class R2NotFoundError extends AppError {
  public constructor(key: string) {
    super(`El archivo '${key}' no existe en R2.`, 404, 'R2_NOT_FOUND');
  }
}