/// <reference types="node" />

import {
  DeleteObjectCommand,
  type GetObjectCommandOutput,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { R2DeleteError, R2NotFoundError, R2UploadError } from '../../src/errors/index.js';
import { R2Service } from '../../src/services/R2Service.js';

const { mockEnv, sendMock } = vi.hoisted(() => ({
  mockEnv: {
    R2_BUCKET_NAME: 'test-bucket',
  },
  sendMock: vi.fn(),
}));

vi.mock('@config/env.js', () => ({
  env: mockEnv,
}));

vi.mock('@config/r2Client.js', () => ({
  r2Client: {
    send: sendMock,
  },
}));

describe('R2Service > uploadFile', () => {
  let service: R2Service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new R2Service();
  });

  it('debe retornar UploadResult con key, size, contentType y uploadedAt', async () => {
    // Arrange
    sendMock.mockResolvedValueOnce({});

    // Act
    const result = await service.uploadFile('folder/image.webp', Buffer.from('image-data'), 'image/webp');

    // Assert
    expect(result).toMatchObject({
      key: 'folder/image.webp',
      size: 10,
      contentType: 'image/webp',
      uploadedAt: expect.any(String),
    });
  });

  it('debe sanitizar el key removiendo path traversal', async () => {
    // Arrange
    sendMock.mockResolvedValueOnce({});

    // Act
    await service.uploadFile('../../etc/passwd', Buffer.from('data'), 'text/plain');

    // Assert
    expect((sendMock.mock.calls[0]?.[0] as PutObjectCommand).input.Key).toBe('etc/passwd');
  });

  it('debe lanzar R2UploadError si el cliente S3 falla', async () => {
    // Arrange
    sendMock.mockRejectedValueOnce(new Error('S3 upload failure'));

    // Act
    const uploadPromise = service.uploadFile('folder/doc.txt', Buffer.from('content'), 'text/plain');

    // Assert
    await expect(uploadPromise).rejects.toBeInstanceOf(R2UploadError);
  });

});

describe('R2Service > getFile', () => {
  let service: R2Service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new R2Service();
  });

  it('debe retornar el output del SDK cuando el archivo existe', async () => {
    // Arrange
    const sdkOutput: GetObjectCommandOutput = {
      $metadata: {},
      ContentLength: 123,
      ContentType: 'text/plain',
    };
    sendMock.mockResolvedValueOnce(sdkOutput);

    // Act
    const result = await service.getFile('folder/exists.txt');

    // Assert
    expect(result).toBe(sdkOutput);
  });

  it('debe lanzar R2NotFoundError cuando el archivo no existe', async () => {
    // Arrange
    const notFoundError: Error = new Error('No such key');
    notFoundError.name = 'NoSuchKey';
    sendMock.mockRejectedValueOnce(notFoundError);

    // Act
    const getPromise = service.getFile('folder/missing.txt');

    // Assert
    await expect(getPromise).rejects.toBeInstanceOf(R2NotFoundError);
  });

  it('debe lanzar R2NotFoundError cuando SDK responde 404 en metadata', async () => {
    // Arrange
    sendMock.mockRejectedValueOnce({
      $metadata: {
        httpStatusCode: 404,
      },
    });

    // Act
    const getPromise = service.getFile('folder/not-found-by-metadata.txt');

    // Assert
    await expect(getPromise).rejects.toBeInstanceOf(R2NotFoundError);
  });

  it('debe propagar el error cuando no corresponde a not found', async () => {
    // Arrange
    const unexpectedError = new Error('Unexpected SDK failure');
    sendMock.mockRejectedValueOnce(unexpectedError);

    // Act
    const getPromise = service.getFile('folder/error.txt');

    // Assert
    await expect(getPromise).rejects.toBe(unexpectedError);
  });
});

describe('R2Service > deleteFile', () => {
  let service: R2Service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new R2Service();
  });

  it('debe retornar DeleteResult con key y deletedAt cuando el archivo existe', async () => {
    // Arrange
    sendMock.mockResolvedValueOnce({});
    sendMock.mockResolvedValueOnce({});

    // Act
    const result = await service.deleteFile('folder/delete-me.txt');

    // Assert
    expect(result).toMatchObject({
      key: 'folder/delete-me.txt',
      deletedAt: expect.any(String),
    });
  });

  it('debe lanzar R2NotFoundError si fileExists retorna false', async () => {
    // Arrange
    sendMock.mockRejectedValueOnce(new Error('HeadObject failed'));

    // Act
    const deletePromise = service.deleteFile('folder/missing.txt');

    // Assert
    await expect(deletePromise).rejects.toBeInstanceOf(R2NotFoundError);
  });

  it('debe lanzar R2DeleteError si DeleteObjectCommand falla', async () => {
    // Arrange
    sendMock.mockResolvedValueOnce({});
    sendMock.mockRejectedValueOnce(new Error('Delete failed'));

    // Act
    const deletePromise = service.deleteFile('folder/delete-error.txt');

    // Assert
    await expect(deletePromise).rejects.toBeInstanceOf(R2DeleteError);
  });
});

describe('R2Service > listFiles', () => {
  let service: R2Service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new R2Service();
  });

  it('debe retornar ListResult con files y count correctos', async () => {
    // Arrange
    sendMock.mockResolvedValueOnce({
      Contents: [
        {
          Key: 'images/a.webp',
          Size: 100,
          LastModified: new Date('2026-03-23T10:00:00.000Z'),
        },
        {
          Key: 'images/b.webp',
          Size: 200,
          LastModified: new Date('2026-03-23T11:00:00.000Z'),
        },
      ],
    });

    // Act
    const result = await service.listFiles('images/');

    // Assert
    expect(result).toEqual({
      files: [
        {
          key: 'images/a.webp',
          size: 100,
          lastModified: '2026-03-23T10:00:00.000Z',
        },
        {
          key: 'images/b.webp',
          size: 200,
          lastModified: '2026-03-23T11:00:00.000Z',
        },
      ],
      count: 2,
    });
  });

  it('debe retornar lista vacia si el bucket no tiene objetos con ese prefijo', async () => {
    // Arrange
    sendMock.mockResolvedValueOnce({ Contents: [] });

    // Act
    const result = await service.listFiles('empty/');

    // Assert
    expect(result).toEqual({ files: [], count: 0 });
  });

  it('debe pasar el prefix al comando S3 cuando se proporciona', async () => {
    // Arrange
    sendMock.mockResolvedValueOnce({ Contents: [] });

    // Act
    await service.listFiles('images/');

    // Assert
    expect((sendMock.mock.calls[0]?.[0] as ListObjectsV2Command).input.Prefix).toBe('images/');
  });

  it('debe ignorar items que no tengan key en la respuesta del SDK', async () => {
    // Arrange
    sendMock.mockResolvedValueOnce({
      Contents: [
        {
          Size: 50,
          LastModified: new Date('2026-03-23T12:00:00.000Z'),
        },
        {
          Key: 'images/valid.webp',
          Size: 150,
          LastModified: new Date('2026-03-23T13:00:00.000Z'),
        },
      ],
    });

    // Act
    const result = await service.listFiles('images/');

    // Assert
    expect(result.count).toBe(1);
  });

  it('debe sanitizar el prefix antes de enviarlo a S3', async () => {
    // Arrange
    sendMock.mockResolvedValueOnce({ Contents: [] });

    // Act
    await service.listFiles('../../images/');

    // Assert
    expect((sendMock.mock.calls[0]?.[0] as ListObjectsV2Command).input.Prefix).toBe('images/');
  });

});

describe('R2Service > fileExists', () => {
  let service: R2Service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new R2Service();
  });

  it('debe retornar true si HeadObjectCommand resuelve correctamente', async () => {
    // Arrange
    sendMock.mockResolvedValueOnce({});

    // Act
    const exists = await service.fileExists('folder/exists.txt');

    // Assert
    expect(exists).toBe(true);
  });

  it('debe retornar false si HeadObjectCommand lanza cualquier error', async () => {
    // Arrange
    sendMock.mockRejectedValueOnce(new Error('HeadObject failed'));

    // Act
    const exists = await service.fileExists('folder/missing.txt');

    // Assert
    expect(exists).toBe(false);
  });

  it('debe sanitizar el key al verificar existencia', async () => {
    // Arrange
    sendMock.mockResolvedValueOnce({});

    // Act
    await service.fileExists('../../private/file.txt');

    // Assert
    expect((sendMock.mock.calls[0]?.[0] as HeadObjectCommand).input.Key).toBe('private/file.txt');
  });
});
