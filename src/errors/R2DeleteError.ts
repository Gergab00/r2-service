import { AppError } from './AppError.js';

/**
 * Se lanza cuando una operación de eliminación en R2 falla y deja el objeto sin borrar.
 */
export class R2DeleteError extends AppError {
  public override readonly cause?: unknown;

  public constructor(key: string, cause?: unknown) {
    super(`No se pudo eliminar el archivo '${key}' de R2.`, 500, 'R2_DELETE_FAILED');

    this.cause = cause;
  }
}