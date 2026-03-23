/**
 * Error base del dominio para fallos controlados del microservicio.
 * Se lanza cuando una operación debe propagarse al middleware HTTP con
 * un código y estado específicos.
 */
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  protected constructor(message: string, statusCode: number, code: string) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}