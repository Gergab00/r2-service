import { AppError } from './AppError.js';

/**
 * Se lanza cuando la entrada recibida por el servicio no cumple con las reglas de validación.
 */
export class ValidationError extends AppError {
  public readonly details: unknown;

  public constructor(details: unknown) {
    super('La solicitud contiene datos inválidos.', 400, 'VALIDATION_ERROR');

    this.details = details;
  }
}