import { AppError } from './AppError.js';

/**
 * Se lanza cuando no se puede generar una URL firmada temporal para descarga.
 */
export class R2SignedUrlError extends AppError {
  public override readonly cause?: unknown;

  public constructor(key: string, cause?: unknown) {
    super(
      `No se pudo generar una URL firmada temporal para el archivo '${key}'.`,
      500,
      'R2_SIGNED_URL_FAILED',
    );

    this.cause = cause;
  }
}
