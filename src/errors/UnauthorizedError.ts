import { AppError } from './AppError.js';

/**
 * Se lanza cuando la solicitud no incluye una API Key válida para acceder al servicio.
 */
export class UnauthorizedError extends AppError {
  public constructor() {
    super('API Key inválida o ausente.', 401, 'UNAUTHORIZED');
  }
}