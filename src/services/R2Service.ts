import {
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  HeadObjectCommand,
  ListObjectsV2Command,
  type S3ServiceException,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '@config/env.js';
import { r2Client } from '@config/r2Client.js';
import { R2DeleteError, R2NotFoundError, R2SignedUrlError, R2UploadError } from '@errors/index.js';

export type UploadResult = {
  key: string;
  publicUrl: string | null;
  size: number;
  contentType: string;
  uploadedAt: string;
};

export type DeleteResult = {
  key: string;
  deletedAt: string;
};

export type FileItem = {
  key: string;
  publicUrl: string | null;
  size: number;
  lastModified: string | null;
};

export type ListResult = {
  files: FileItem[];
  count: number;
};

export type SignedUrlResult = {
  signedUrl: string;
  expiresIn: number;
  expiresAt: string;
};

/**
 * Servicio de dominio para operaciones de almacenamiento en Cloudflare R2.
 *
 * Esta clase encapsula toda interacción directa con el SDK S3-compatible
 * y expone métodos tipados para la capa de rutas y handlers.
 */
export class R2Service {
  /**
   * Sube un archivo al bucket configurado de Cloudflare R2.
   *
   * @param key - Ruta o identificador del objeto dentro del bucket.
   * @param body - Contenido binario del archivo a subir.
   * @param contentType - MIME type a registrar para el objeto.
   * @returns Metadatos del archivo subido incluyendo URL pública (si aplica).
   * @throws {R2UploadError} Si la operación de subida falla por cualquier motivo.
   */
  public async uploadFile(key: string, body: Buffer, contentType: string): Promise<UploadResult> {
    const safeKey: string = this.sanitizeKey(key);

    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: safeKey,
          Body: body,
          ContentType: contentType,
          ContentLength: body.length,
        }),
      );
    } catch (error: unknown) {
      throw new R2UploadError(safeKey, error);
    }

    return {
      key: safeKey,
      publicUrl: this.buildPublicUrl(safeKey),
      size: body.length,
      contentType,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Obtiene un objeto del bucket para ser procesado por streaming en el handler.
   *
   * @param key - Ruta o identificador del objeto dentro del bucket.
   * @returns Respuesta cruda del SDK con body y metadatos del objeto.
   * @throws {R2NotFoundError} Si el objeto no existe en R2.
   */
  public async getFile(key: string): Promise<GetObjectCommandOutput> {
    const safeKey: string = this.sanitizeKey(key);

    try {
      return await r2Client.send(
        new GetObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: safeKey,
        }),
      );
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new R2NotFoundError(safeKey);
      }

      throw error;
    }
  }

  /**
   * Elimina un objeto del bucket validando primero su existencia.
   *
   * @param key - Ruta o identificador del objeto a eliminar.
   * @returns Confirmación con clave eliminada y timestamp de borrado.
   * @throws {R2NotFoundError} Si el objeto no existe antes de intentar borrarlo.
   * @throws {R2DeleteError} Si la operación de eliminación falla.
   */
  public async deleteFile(key: string): Promise<DeleteResult> {
    const safeKey: string = this.sanitizeKey(key);

    if (!(await this.fileExists(safeKey))) {
      throw new R2NotFoundError(safeKey);
    }

    try {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: safeKey,
        }),
      );
    } catch (error: unknown) {
      throw new R2DeleteError(safeKey, error);
    }

    return {
      key: safeKey,
      deletedAt: new Date().toISOString(),
    };
  }

  /**
   * Lista objetos del bucket con filtro opcional por prefijo.
   *
   * @param prefix - Prefijo opcional para filtrar claves dentro del bucket.
   * @returns Colección tipada de archivos y total de elementos retornados.
   */
  public async listFiles(prefix?: string): Promise<ListResult> {
    const safePrefix: string | undefined = prefix !== undefined ? this.sanitizeKey(prefix) : undefined;

    const output = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: env.R2_BUCKET_NAME,
        Prefix: safePrefix,
      }),
    );

    const files: FileItem[] = (output.Contents ?? []).reduce<FileItem[]>((accumulator, item) => {
      if (item.Key === undefined) {
        return accumulator;
      }

      accumulator.push({
        key: item.Key,
        publicUrl: this.buildPublicUrl(item.Key),
        size: item.Size ?? 0,
        lastModified: item.LastModified?.toISOString() ?? null,
      });

      return accumulator;
    }, []);

    return {
      files,
      count: files.length,
    };
  }

  /**
   * Genera una URL firmada temporal para descargar un archivo existente en R2.
   *
   * @param key - Ruta o identificador del objeto dentro del bucket.
   * @param expiresIn - Duracion de la URL firmada en segundos.
   * @returns URL firmada junto con metadatos de expiracion.
   * @throws {R2NotFoundError} Si el archivo solicitado no existe en R2.
   * @throws {R2SignedUrlError} Si la firma temporal no puede generarse.
   */
  public async getDownloadSignedUrl(key: string, expiresIn: number): Promise<SignedUrlResult> {
    const safeKey: string = this.sanitizeKey(key);

    if (!(await this.fileExists(safeKey))) {
      throw new R2NotFoundError(safeKey);
    }

    try {
      const signedUrl: string = await getSignedUrl(
        r2Client,
        new GetObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: safeKey,
        }),
        { expiresIn },
      );
      const expiresAt: string = new Date(Date.now() + expiresIn * 1000).toISOString();

      return {
        signedUrl,
        expiresIn,
        expiresAt,
      };
    } catch (error: unknown) {
      throw new R2SignedUrlError(safeKey, error);
    }
  }

  /**
   * Verifica la existencia de un objeto en R2 sin propagar errores al consumidor.
   *
   * @param key - Ruta o identificador del objeto dentro del bucket.
   * @returns `true` si el objeto existe; `false` en caso contrario.
   */
  public async fileExists(key: string): Promise<boolean> {
    const safeKey: string = this.sanitizeKey(key);

    try {
      await r2Client.send(
        new HeadObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: safeKey,
        }),
      );

      return true;
    } catch {
      return false;
    }
  }

  private sanitizeKey(key: string): string {
    return key.replace(/\.\.\//g, '').replace(/^\/+/, '');
  }

  private buildPublicUrl(key: string): string | null {
    if (!env.R2_PUBLIC_URL) {
      return null;
    }

    return `${env.R2_PUBLIC_URL}/${key}`;
  }

  private isNotFoundError(error: unknown): boolean {
    if (error instanceof Error && 'name' in error && error.name === 'NoSuchKey') {
      return true;
    }

    if (this.hasHttpStatusCode(error, 404)) {
      return true;
    }

    return false;
  }

  private hasHttpStatusCode(error: unknown, statusCode: number): boolean {
    if (!this.isS3ServiceException(error)) {
      return false;
    }

    return error.$metadata?.httpStatusCode === statusCode;
  }

  private isS3ServiceException(error: unknown): error is S3ServiceException {
    if (error === null || typeof error !== 'object') {
      return false;
    }

    return '$metadata' in error;
  }
}

export const r2Service: R2Service = new R2Service();
