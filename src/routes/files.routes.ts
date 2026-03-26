import { type Context, Hono } from 'hono';
import type { GetObjectCommandOutput } from '@aws-sdk/client-s3';

import { ValidationError } from '../errors/index.js';
import {
  deleteKeySchema,
  downloadKeySchema,
  importFromUrlBodySchema,
  listQuerySchema,
  signedUrlBodySchema,
  uploadKeySchema,
  uploadQuerySchema,
  type DeleteKeyInput,
  type DownloadKeyInput,
  type ImportFromUrlBodyInput,
  type ListQueryInput,
  type SignedUrlBodyInput,
  type UploadKeyInput,
  type UploadQueryInput,
} from '../schemas/index.js';
import {
  r2Service,
  type DeleteResult,
  type ListResult,
  type SignedUrlResult,
  type UploadResult,
} from '../services/R2Service.js';
import {
  importFileFromUrlUseCase,
  type ImportFileFromUrlResult,
} from '../use-cases/ImportFileFromUrlUseCase.js';

type SuccessResponse<TData> = {
  success: true;
  data: TData;
  timestamp: string;
};

const filesRoutes: Hono = new Hono();

const parseJsonBody = async <TBody>(c: Context): Promise<TBody> => {
  try {
    return (await c.req.json()) as TBody;
  } catch {
    throw new ValidationError({
      body: ['El body de la solicitud debe ser un JSON válido.'],
    });
  }
};

/**
 * POST /files/:key
 *
 * Valida params y query, sube el archivo recibido en el body y responde
 * con metadata tipada del objeto creado.
 */
const uploadFileHandler = async (c: Context): Promise<Response> => {
  const { key }: UploadKeyInput = uploadKeySchema.parse(c.req.param());
  const { contentType }: UploadQueryInput = uploadQuerySchema.parse(c.req.query());
  const bodyArrayBuffer: ArrayBuffer = await c.req.arrayBuffer();
  const bodyBuffer: Buffer = Buffer.from(bodyArrayBuffer);
  const uploadResult: UploadResult = await r2Service.uploadFile(key, bodyBuffer, contentType);

  const response: SuccessResponse<UploadResult> = {
    success: true,
    data: uploadResult,
    timestamp: new Date().toISOString(),
  };

  return c.json(response, 201);
};

/**
 * POST /files/import-from-url
 *
 * Valida el body JSON, delega la descarga y subida al caso de uso y responde
 * con la metadata tipada del archivo importado.
 */
const importFileFromUrlHandler = async (c: Context): Promise<Response> => {
  const rawBody: unknown = await parseJsonBody<unknown>(c);
  const body: ImportFromUrlBodyInput = importFromUrlBodySchema.parse(rawBody);
  const importResult: ImportFileFromUrlResult = await importFileFromUrlUseCase.execute(body);

  const response: SuccessResponse<ImportFileFromUrlResult> = {
    success: true,
    data: importResult,
    timestamp: new Date().toISOString(),
  };

  return c.json(response, 201);
};

/**
 * GET /files/:key
 *
 * Valida params y hace streaming directo del contenido almacenado en R2,
 * conservando el Content-Type original y politica de cache publica.
 */
const downloadFileHandler = async (c: Context): Promise<Response> => {
  const { key }: DownloadKeyInput = downloadKeySchema.parse(c.req.param());
  const file: GetObjectCommandOutput = await r2Service.getFile(key);
  const contentType: string = file.ContentType ?? 'application/octet-stream';

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000',
  };

  if (file.Body === undefined) {
    return c.body(null, 200, headers);
  }

  return c.body(file.Body.transformToWebStream(), 200, headers);
};

/**
 * DELETE /files/:key
 *
 * Valida params, elimina el archivo en R2 y responde con confirmacion
 * tipada de la operacion de borrado.
 */
const deleteFileHandler = async (c: Context): Promise<Response> => {
  const { key }: DeleteKeyInput = deleteKeySchema.parse(c.req.param());
  const deleteResult: DeleteResult = await r2Service.deleteFile(key);

  const response: SuccessResponse<DeleteResult> = {
    success: true,
    data: deleteResult,
    timestamp: new Date().toISOString(),
  };

  return c.json(response, 200);
};

/**
 * GET /files
 *
 * Valida query, delega el listado al servicio y responde con una estructura
 * tipada con coleccion de archivos y total.
 */
const listFilesHandler = async (c: Context): Promise<Response> => {
  const { prefix }: ListQueryInput = listQuerySchema.parse(c.req.query());
  const listResult: ListResult = await r2Service.listFiles(prefix);

  const response: SuccessResponse<ListResult> = {
    success: true,
    data: listResult,
    timestamp: new Date().toISOString(),
  };

  return c.json(response, 200);
};

/**
 * POST /files/signed-url
 *
 * Valida body JSON, genera una URL firmada temporal para descarga y responde
 * con metadatos de expiracion en formato tipado.
 */
const signedUrlHandler = async (c: Context): Promise<Response> => {
  const rawBody: unknown = await parseJsonBody<unknown>(c);
  const body: SignedUrlBodyInput = signedUrlBodySchema.parse(rawBody);
  const signedUrlResult: SignedUrlResult = await r2Service.getDownloadSignedUrl(body.key, body.expiresIn);

  const response: SuccessResponse<SignedUrlResult> = {
    success: true,
    data: signedUrlResult,
    timestamp: new Date().toISOString(),
  };

  return c.json(response, 200);
};

filesRoutes.post('/files/import-from-url', importFileFromUrlHandler);
filesRoutes.post('/files/signed-url', signedUrlHandler);
filesRoutes.post('/files/:key', uploadFileHandler);
filesRoutes.get('/files/:key', downloadFileHandler);
filesRoutes.delete('/files/:key', deleteFileHandler);
filesRoutes.get('/files', listFilesHandler);

export { filesRoutes };
