/// <reference types="node" />

import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { R2NotFoundError, R2SignedUrlError } from '../../src/errors/index.js';
import { R2Service } from '../../src/services/R2Service.js';

const { getSignedUrlMock, mockEnv, sendMock } = vi.hoisted(() => ({
  getSignedUrlMock: vi.fn(),
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

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: getSignedUrlMock,
}));

describe('R2Service > getDownloadSignedUrl', () => {
  let service: R2Service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new R2Service();
  });

  it('debe generar una URL firmada temporal cuando el archivo existe', async () => {
    sendMock.mockResolvedValueOnce({});
    getSignedUrlMock.mockResolvedValueOnce('https://signed.example.com/object?X-Amz-Expires=900');

    const result = await service.getDownloadSignedUrl('private/folder/document.pdf', 900);

    expect(result).toMatchObject({
      signedUrl: 'https://signed.example.com/object?X-Amz-Expires=900',
      expiresIn: 900,
      expiresAt: expect.any(String),
    });
    expect(new Date(result.expiresAt).toString()).not.toBe('Invalid Date');

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect((sendMock.mock.calls[0]?.[0] as HeadObjectCommand).input).toMatchObject({
      Bucket: 'test-bucket',
      Key: 'private/folder/document.pdf',
    });

    expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
    expect(getSignedUrlMock.mock.calls[0]?.[1]).toBeInstanceOf(GetObjectCommand);
    expect((getSignedUrlMock.mock.calls[0]?.[1] as GetObjectCommand).input).toMatchObject({
      Bucket: 'test-bucket',
      Key: 'private/folder/document.pdf',
    });
    expect(getSignedUrlMock.mock.calls[0]?.[2]).toEqual({ expiresIn: 900 });
  });

  it('debe sanitizar la key antes de verificar existencia y firmar', async () => {
    sendMock.mockResolvedValueOnce({});
    getSignedUrlMock.mockResolvedValueOnce('https://signed.example.com/object?X-Amz-Expires=900');

    await service.getDownloadSignedUrl('../../private/folder/document.pdf', 900);

    expect((sendMock.mock.calls[0]?.[0] as HeadObjectCommand).input.Key).toBe('private/folder/document.pdf');
    expect((getSignedUrlMock.mock.calls[0]?.[1] as GetObjectCommand).input.Key).toBe(
      'private/folder/document.pdf',
    );
  });

  it('debe lanzar R2NotFoundError cuando el archivo no existe', async () => {
    sendMock.mockRejectedValueOnce(new Error('not found'));

    const resultPromise = service.getDownloadSignedUrl('private/missing.pdf', 900);

    await expect(resultPromise).rejects.toBeInstanceOf(R2NotFoundError);
    expect(getSignedUrlMock).not.toHaveBeenCalled();
  });

  it('debe lanzar R2SignedUrlError cuando falla el presigner', async () => {
    sendMock.mockResolvedValueOnce({});
    getSignedUrlMock.mockRejectedValueOnce(new Error('presigner failure'));

    const resultPromise = service.getDownloadSignedUrl('private/document.pdf', 900);

    await expect(resultPromise).rejects.toBeInstanceOf(R2SignedUrlError);
  });
});
