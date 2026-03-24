import {
  RemoteFileFetcherService,
  remoteFileFetcherService,
  type RemoteFileDownloadResult,
} from '@services/RemoteFileFetcherService.js';
import { R2Service, type UploadResult, r2Service } from '@services/R2Service.js';

export type ImportFileFromUrlInput = {
  url: string;
  key: string;
};

export type ImportFileFromUrlResult = UploadResult;

type ImportFileFromUrlDependencies = {
  remoteFileFetcherService: RemoteFileFetcherService;
  r2Service: R2Service;
};

/**
 * Caso de uso que orquesta la importación de un archivo remoto hacia R2.
 *
 * Se encarga únicamente de coordinar la descarga segura y la subida posterior,
 * sin mezclar validación HTTP ni detalles internos de transporte.
 */
export class ImportFileFromUrlUseCase {
  private readonly remoteFileFetcherService: RemoteFileFetcherService;
  private readonly r2Service: R2Service;

  public constructor(dependencies: ImportFileFromUrlDependencies) {
    this.remoteFileFetcherService = dependencies.remoteFileFetcherService;
    this.r2Service = dependencies.r2Service;
  }

  /**
   * Importa un archivo remoto descargándolo primero y subiéndolo luego a R2.
   *
   * @param input - URL remota del archivo y key destino en R2.
   * @returns Resultado tipado de la subida en R2.
   */
  public async execute(input: ImportFileFromUrlInput): Promise<ImportFileFromUrlResult> {
    const remoteFile: RemoteFileDownloadResult = await this.remoteFileFetcherService.downloadFile(
      input.url,
    );

    return this.r2Service.uploadFile(input.key, remoteFile.buffer, remoteFile.contentType);
  }
}

export const importFileFromUrlUseCase: ImportFileFromUrlUseCase = new ImportFileFromUrlUseCase({
  remoteFileFetcherService,
  r2Service,
});