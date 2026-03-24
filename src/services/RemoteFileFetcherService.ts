import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { env } from '@config/env.js';
import {
  RemoteFetchDownloadError,
  RemoteFetchHostNotAllowedError,
  RemoteFetchInvalidUrlError,
  RemoteFetchMimeTypeNotAllowedError,
  RemoteFetchSizeLimitExceededError,
  RemoteFetchSsrfError,
} from '@errors/index.js';

const REDIRECT_STATUS_CODES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

export type RemoteFileDownloadResult = {
  buffer: Buffer;
  contentType: string;
  finalUrl: string;
  size: number;
};

/**
 * Descarga archivos remotos de forma segura aplicando restricciones de host,
 * validación DNS anti-SSRF, redirects manuales y límites de tamaño/contenido.
 */
export class RemoteFileFetcherService {
  private readonly allowedHosts: ReadonlySet<string>;
  private readonly allowedMimeTypes: ReadonlySet<string>;
  private readonly maxBytes: number;
  private readonly timeoutMs: number;
  private readonly maxRedirects: number;

  public constructor() {
    this.allowedHosts = this.parseCsvEnv(env.REMOTE_FETCH_ALLOWED_HOSTS);
    this.allowedMimeTypes = this.parseCsvEnv(env.REMOTE_FETCH_ALLOWED_MIME_TYPES);
    this.maxBytes = env.REMOTE_FETCH_MAX_BYTES;
    this.timeoutMs = env.REMOTE_FETCH_TIMEOUT_MS;
    this.maxRedirects = env.REMOTE_FETCH_MAX_REDIRECTS;
  }

  /**
   * Descarga un recurso remoto validando URL, host, resolución DNS, redirects,
   * tipo MIME y tamaño máximo permitido.
   *
   * @param url - URL remota del archivo a descargar.
   * @returns Buffer del archivo y metadatos básicos de la descarga.
   */
  public async downloadFile(url: string): Promise<RemoteFileDownloadResult> {
    const originalUrl: URL = this.parseUrl(url);
    let currentUrl: URL = originalUrl;

    for (let redirectCount = 0; redirectCount <= this.maxRedirects; redirectCount += 1) {
      await this.assertSafeRemoteUrl(currentUrl);

      const response: Response = await this.fetchOnce(currentUrl);

      if (this.isRedirectResponse(response.status)) {
        currentUrl = this.resolveRedirectUrl(currentUrl, response, redirectCount);
        continue;
      }

      if (!response.ok) {
        throw new RemoteFetchDownloadError(
          currentUrl.toString(),
          new Error(`El origen remoto respondió con estado HTTP ${response.status}.`),
        );
      }

      const contentType: string = this.getContentType(response);

      this.assertAllowedMimeType(contentType);
      this.assertContentLengthHeader(response);

      const buffer: Buffer = await this.readResponseBody(response, currentUrl.toString());

      return {
        buffer,
        contentType,
        finalUrl: currentUrl.toString(),
        size: buffer.length,
      };
    }

    throw new RemoteFetchDownloadError(
      originalUrl.toString(),
      new Error(`Se excedió el máximo de ${this.maxRedirects} redirecciones.`),
    );
  }

  private parseCsvEnv(value: string): ReadonlySet<string> {
    return new Set(
      value
        .split(',')
        .map((item: string) => item.trim().toLowerCase())
        .filter((item: string) => item.length > 0),
    );
  }

  private parseUrl(rawUrl: string): URL {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new RemoteFetchInvalidUrlError(rawUrl);
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new RemoteFetchInvalidUrlError(rawUrl);
    }

    if (parsedUrl.username.length > 0 || parsedUrl.password.length > 0) {
      throw new RemoteFetchInvalidUrlError(rawUrl);
    }

    return parsedUrl;
  }

  private async assertSafeRemoteUrl(url: URL): Promise<void> {
    const hostname: string = url.hostname.toLowerCase();

    this.assertAllowedHost(hostname);
    await this.assertSafeDnsResolution(hostname);
  }

  private assertAllowedHost(hostname: string): void {
    if (!this.allowedHosts.has(hostname)) {
      throw new RemoteFetchHostNotAllowedError(hostname);
    }
  }

  private async assertSafeDnsResolution(hostname: string): Promise<void> {
    if (this.isBlockedIpAddress(hostname)) {
      throw new RemoteFetchSsrfError(hostname);
    }

    let addresses: Array<{ address: string }>;

    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch (error: unknown) {
      throw new RemoteFetchDownloadError(hostname, error);
    }

    if (addresses.length === 0) {
      throw new RemoteFetchDownloadError(
        hostname,
        new Error('El host remoto no resolvió a ninguna dirección IP.'),
      );
    }

    for (const { address } of addresses) {
      if (this.isBlockedIpAddress(address)) {
        throw new RemoteFetchSsrfError(hostname);
      }
    }
  }

  private async fetchOnce(url: URL): Promise<Response> {
    try {
      return await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error: unknown) {
      throw new RemoteFetchDownloadError(url.toString(), error);
    }
  }

  private isRedirectResponse(statusCode: number): boolean {
    return REDIRECT_STATUS_CODES.has(statusCode);
  }

  private resolveRedirectUrl(currentUrl: URL, response: Response, redirectCount: number): URL {
    if (redirectCount >= this.maxRedirects) {
      throw new RemoteFetchDownloadError(
        currentUrl.toString(),
        new Error(`Se excedió el máximo de ${this.maxRedirects} redirecciones.`),
      );
    }

    const locationHeader: string | null = response.headers.get('location');

    if (locationHeader === null || locationHeader.trim().length === 0) {
      throw new RemoteFetchDownloadError(
        currentUrl.toString(),
        new Error('La respuesta de redirección no incluye un header Location válido.'),
      );
    }

    return this.parseUrl(new URL(locationHeader, currentUrl).toString());
  }

  private getContentType(response: Response): string {
    const rawContentType: string | null = response.headers.get('content-type');
    const normalizedContentType: string = rawContentType?.split(';')[0]?.trim().toLowerCase() ?? '';

    return normalizedContentType;
  }

  private assertAllowedMimeType(contentType: string): void {
    if (!this.allowedMimeTypes.has(contentType)) {
      throw new RemoteFetchMimeTypeNotAllowedError(contentType || 'desconocido');
    }
  }

  private assertContentLengthHeader(response: Response): void {
    const contentLengthHeader: string | null = response.headers.get('content-length');

    if (contentLengthHeader === null) {
      return;
    }

    const parsedContentLength: number = Number.parseInt(contentLengthHeader, 10);

    if (!Number.isFinite(parsedContentLength) || parsedContentLength < 0) {
      throw new RemoteFetchDownloadError(
        response.url,
        new Error('El header Content-Length del origen remoto es inválido.'),
      );
    }

    if (parsedContentLength > this.maxBytes) {
      throw new RemoteFetchSizeLimitExceededError(this.maxBytes);
    }
  }

  private async readResponseBody(response: Response, url: string): Promise<Buffer> {
    if (response.body === null) {
      throw new RemoteFetchDownloadError(url, new Error('La respuesta remota no contiene body.'));
    }

    const reader: ReadableStreamDefaultReader<Uint8Array> = response.body.getReader();
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > this.maxBytes) {
        await reader.cancel();
        throw new RemoteFetchSizeLimitExceededError(this.maxBytes);
      }

      chunks.push(Buffer.from(value));
    }

    return Buffer.concat(chunks, totalBytes);
  }

  private isBlockedIpAddress(value: string): boolean {
    const ipVersion: number = isIP(value);

    if (ipVersion === 4) {
      return this.isBlockedIpv4Address(value);
    }

    if (ipVersion === 6) {
      return this.isBlockedIpv6Address(value);
    }

    return false;
  }

  private isBlockedIpv4Address(address: string): boolean {
    const octets: number[] = address.split('.').map((segment: string) => Number.parseInt(segment, 10));
    const [firstOctet, secondOctet] = octets;

    if (firstOctet === undefined || secondOctet === undefined || octets.length !== 4) {
      return true;
    }

    if (firstOctet === 10 || firstOctet === 127 || firstOctet === 0) {
      return true;
    }

    if (firstOctet === 169 && secondOctet === 254) {
      return true;
    }

    if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }

    if (firstOctet === 192 && secondOctet === 168) {
      return true;
    }

    if (firstOctet === 100 && secondOctet >= 64 && secondOctet <= 127) {
      return true;
    }

    if (firstOctet === 198 && (secondOctet === 18 || secondOctet === 19)) {
      return true;
    }

    if (firstOctet >= 224) {
      return true;
    }

    return false;
  }

  private isBlockedIpv6Address(address: string): boolean {
    const normalizedAddress: string = address.toLowerCase();

    if (normalizedAddress === '::1' || normalizedAddress === '::') {
      return true;
    }

    if (normalizedAddress.startsWith('fc') || normalizedAddress.startsWith('fd')) {
      return true;
    }

    if (normalizedAddress.startsWith('fe8') || normalizedAddress.startsWith('fe9')) {
      return true;
    }

    if (normalizedAddress.startsWith('fea') || normalizedAddress.startsWith('feb')) {
      return true;
    }

    if (normalizedAddress.startsWith('::ffff:')) {
      return this.isBlockedIpAddress(normalizedAddress.replace('::ffff:', ''));
    }

    return false;
  }
}

export const remoteFileFetcherService: RemoteFileFetcherService = new RemoteFileFetcherService();