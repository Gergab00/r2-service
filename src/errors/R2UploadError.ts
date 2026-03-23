import { AppError } from './AppError.js';

/**
 * Se lanza cuando una operación de subida hacia R2 falla y no puede completarse.
 */
export class R2UploadError extends AppError {
  public override readonly cause?: unknown;

  public constructor(key: string, cause?: unknown) {
    super(`No se pudo subir el archivo '${key}' a R2.`, 500, 'R2_UPLOAD_FAILED');

    this.cause = cause;
  }
}