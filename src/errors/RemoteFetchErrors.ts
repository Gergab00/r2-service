import { AppError } from './AppError.js';

/**
 * Se lanza cuando la URL proporcionada para la importación remota es malformada
 * o no tiene un esquema HTTP/HTTPS válido.
 */
export class RemoteFetchInvalidUrlError extends AppError {
  public constructor(url: string) {
    super(`La URL '${url}' no es válida para importación remota.`, 400, 'REMOTE_FETCH_INVALID_URL');
  }
}

/**
 * Se lanza cuando el host de la URL no está registrado en la allowlist
 * configurada en REMOTE_FETCH_ALLOWED_HOSTS.
 */
export class RemoteFetchHostNotAllowedError extends AppError {
  public constructor(host: string) {
    super(`El host '${host}' no está permitido para importación remota.`, 403, 'REMOTE_FETCH_HOST_NOT_ALLOWED');
  }
}

/**
 * Se lanza cuando la URL resuelve a una dirección IP privada, loopback o reservada,
 * bloqueada para prevenir ataques SSRF.
 */
export class RemoteFetchSsrfError extends AppError {
  public constructor(host: string) {
    super(`El host '${host}' resuelve a una dirección bloqueada por política SSRF.`, 403, 'REMOTE_FETCH_SSRF_BLOCKED');
  }
}

/**
 * Se lanza cuando el Content-Type de la respuesta remota no coincide con
 * ninguno de los tipos permitidos en REMOTE_FETCH_ALLOWED_MIME_TYPES.
 */
export class RemoteFetchMimeTypeNotAllowedError extends AppError {
  public constructor(mimeType: string) {
    super(`El tipo MIME '${mimeType}' no está permitido en la importación remota.`, 422, 'REMOTE_FETCH_MIME_NOT_ALLOWED');
  }
}

/**
 * Se lanza cuando el archivo remoto supera el límite de bytes configurado
 * en REMOTE_FETCH_MAX_BYTES.
 */
export class RemoteFetchSizeLimitExceededError extends AppError {
  public constructor(maxBytes: number) {
    super(`El archivo remoto supera el tamaño máximo permitido de ${maxBytes} bytes.`, 413, 'REMOTE_FETCH_SIZE_EXCEEDED');
  }
}

/**
 * Se lanza cuando la descarga del recurso remoto falla: timeout, error de red
 * o respuesta HTTP no exitosa del servidor de origen.
 */
export class RemoteFetchDownloadError extends AppError {
  public override readonly cause?: unknown;

  public constructor(url: string, cause?: unknown) {
    super(`No se pudo descargar el recurso remoto desde '${url}'.`, 502, 'REMOTE_FETCH_DOWNLOAD_FAILED');

    this.cause = cause;
  }
}
