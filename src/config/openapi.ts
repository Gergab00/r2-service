/**
 * OpenAPI base specification for r2-service.
 *
 * This object is the single source of truth for global metadata,
 * server definitions, and authentication configuration.
 */
export const openApiSpec = {
  openapi: '3.1.0',

  // info
  info: {
    title: 'r2-service',
    version: '1.0.0',
    description:
      'Microservice for file storage management in Cloudflare R2.\n\n' +
      'Authentication:\n' +
      '- All protected endpoints require the x-api-key header.\n' +
      '- The API key must be sent as a plain header value.\n' +
      '- Requests without a valid x-api-key return 401 UNAUTHORIZED.',
  },

  // servers
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
    {
      url: 'https://r2-service-production-6368.up.railway.app',
      description: 'Production server',
    },
  ],

  // components
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API key required to access protected endpoints.',
      },
    },
  },

  security: [{ ApiKeyAuth: [] }],
} as const;

/**
 * Reusable OpenAPI components for r2-service.
 *
 * This object centralizes shared schemas and standard responses
 * referenced by endpoints via $ref.
 */
export const openApiComponents = {
  schemas: {
    ErrorResponse: {
      type: 'object',
      additionalProperties: false,
      properties: {
        code: {
          type: 'string',
          example: 'UNAUTHORIZED',
        },
        message: {
          type: 'string',
          example: 'API key invalida o ausente.',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-03-23T14:25:00.000Z',
        },
      },
      required: ['code', 'message', 'timestamp'],
    },

    ValidationErrorResponse: {
      type: 'object',
      additionalProperties: false,
      properties: {
        code: {
          type: 'string',
          example: 'VALIDATION_ERROR',
        },
        message: {
          type: 'string',
          example: 'La solicitud contiene datos inválidos.',
        },
        details: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          example: {
            body: ['El body de la solicitud debe ser un JSON válido.'],
            url: ['El campo url debe ser una URL válida.'],
          },
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-03-23T14:27:00.000Z',
        },
      },
      required: ['code', 'message', 'details', 'timestamp'],
    },

    ImportFromUrlRequest: {
      type: 'object',
      additionalProperties: false,
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          example: 'https://images-na.ssl-images-amazon.com/images/I/71abc12345L._AC_SL1500_.jpg',
        },
        key: {
          type: 'string',
          minLength: 1,
          maxLength: 512,
          pattern: '^[A-Za-z0-9/_.-]+$',
          example: 'productos/B08N5W/importada.jpg',
        },
      },
      required: ['url', 'key'],
    },

    SignedUrlRequest: {
      type: 'object',
      additionalProperties: false,
      properties: {
        key: {
          type: 'string',
          minLength: 1,
          maxLength: 512,
          pattern: '^[A-Za-z0-9/_.-]+$',
          example: 'privados/B08N5W/factura.pdf',
        },
        expiresIn: {
          type: 'integer',
          minimum: 60,
          maximum: 3600,
          default: 900,
          example: 900,
        },
      },
      required: ['key'],
    },

    UploadResponse: {
      type: 'object',
      additionalProperties: false,
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        data: {
          type: 'object',
          additionalProperties: false,
          properties: {
            key: {
              type: 'string',
              example: 'productos/B08N5W/principal.jpg',
            },
            size: {
              type: 'integer',
              minimum: 0,
              example: 183452,
            },
            contentType: {
              type: 'string',
              example: 'image/jpeg',
            },
            uploadedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-23T14:12:58.000Z',
            },
          },
          required: ['key', 'size', 'contentType', 'uploadedAt'],
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-03-23T14:12:58.000Z',
        },
      },
      required: ['success', 'data', 'timestamp'],
    },

    DeleteResponse: {
      type: 'object',
      additionalProperties: false,
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        data: {
          type: 'object',
          additionalProperties: false,
          properties: {
            key: {
              type: 'string',
              example: 'productos/B08N5W/principal.jpg',
            },
            deletedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-23T14:18:11.000Z',
            },
          },
          required: ['key', 'deletedAt'],
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-03-23T14:18:11.000Z',
        },
      },
      required: ['success', 'data', 'timestamp'],
    },

    ListResponse: {
      type: 'object',
      additionalProperties: false,
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        data: {
          type: 'object',
          additionalProperties: false,
          properties: {
            files: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  key: {
                    type: 'string',
                    example: 'productos/B08N5W/principal.jpg',
                  },
                  size: {
                    type: 'integer',
                    minimum: 0,
                    example: 183452,
                  },
                  lastModified: {
                    type: 'string',
                    format: 'date-time',
                    example: '2026-03-23T14:02:21.000Z',
                  },
                },
                required: ['key', 'size', 'lastModified'],
              },
            },
            count: {
              type: 'integer',
              minimum: 0,
              example: 1,
            },
            hasMore: {
              type: 'boolean',
              example: false,
            },
            cursor: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
              example: null,
            },
          },
          required: ['files', 'count', 'hasMore', 'cursor'],
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-03-23T14:20:44.000Z',
        },
      },
      required: ['success', 'data', 'timestamp'],
    },

    SignedUrlResponse: {
      type: 'object',
      additionalProperties: false,
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        data: {
          type: 'object',
          additionalProperties: false,
          properties: {
            signedUrl: {
              type: 'string',
              format: 'uri',
              example:
                'https://example.r2.cloudflarestorage.com/test-bucket/privados/B08N5W/factura.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=900',
            },
            expiresIn: {
              type: 'integer',
              minimum: 60,
              maximum: 3600,
              example: 900,
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-26T17:30:00.000Z',
            },
          },
          required: ['signedUrl', 'expiresIn', 'expiresAt'],
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-03-26T17:15:00.000Z',
        },
      },
      required: ['success', 'data', 'timestamp'],
    },
  },

  // responses
  responses: {
    Unauthorized: {
      description: 'Missing or invalid x-api-key header.',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
        },
      },
    },

    NotFound: {
      description: 'Requested object does not exist in R2.',
      content: {
        'application/json': {
          schema: {
            allOf: [
              { $ref: '#/components/schemas/ErrorResponse' },
              {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    example: 'R2_NOT_FOUND',
                  },
                  message: {
                    type: 'string',
                    example: "El archivo 'productos/B08N5W/principal.jpg' no existe en R2.",
                  },
                },
              },
            ],
          },
        },
      },
    },

    ValidationError: {
      description: 'Request validation failed.',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ValidationErrorResponse',
          },
        },
      },
    },

    RemoteFetchForbidden: {
      description: 'The remote URL is not allowed or was blocked by SSRF protection.',
      content: {
        'application/json': {
          schema: {
            allOf: [
              { $ref: '#/components/schemas/ErrorResponse' },
              {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    enum: ['REMOTE_FETCH_HOST_NOT_ALLOWED', 'REMOTE_FETCH_SSRF_BLOCKED'],
                    example: 'REMOTE_FETCH_HOST_NOT_ALLOWED',
                  },
                  message: {
                    type: 'string',
                    example: "El host 'example.com' no está permitido para importación remota.",
                  },
                },
              },
            ],
          },
        },
      },
    },

    RemoteFetchPayloadTooLarge: {
      description: 'The remote file exceeds the configured maximum allowed size.',
      content: {
        'application/json': {
          schema: {
            allOf: [
              { $ref: '#/components/schemas/ErrorResponse' },
              {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    example: 'REMOTE_FETCH_SIZE_EXCEEDED',
                  },
                  message: {
                    type: 'string',
                    example: 'El archivo remoto supera el tamaño máximo permitido de 5242880 bytes.',
                  },
                },
              },
            ],
          },
        },
      },
    },

    RemoteFetchUnsupportedMediaType: {
      description: 'The remote file has a MIME type that is not allowed.',
      content: {
        'application/json': {
          schema: {
            allOf: [
              { $ref: '#/components/schemas/ErrorResponse' },
              {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    example: 'REMOTE_FETCH_MIME_NOT_ALLOWED',
                  },
                  message: {
                    type: 'string',
                    example: "El tipo MIME 'image/avif' no está permitido en la importación remota.",
                  },
                },
              },
            ],
          },
        },
      },
    },

    RemoteFetchBadGateway: {
      description: 'The remote resource could not be downloaded successfully.',
      content: {
        'application/json': {
          schema: {
            allOf: [
              { $ref: '#/components/schemas/ErrorResponse' },
              {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    example: 'REMOTE_FETCH_DOWNLOAD_FAILED',
                  },
                  message: {
                    type: 'string',
                    example: "No se pudo descargar el recurso remoto desde 'https://images-na.ssl-images-amazon.com/example.jpg'.",
                  },
                },
              },
            ],
          },
        },
      },
    },

    InternalError: {
      description: 'Unexpected internal server error.',
      content: {
        'application/json': {
          schema: {
            allOf: [
              { $ref: '#/components/schemas/ErrorResponse' },
              {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    example: 'INTERNAL_ERROR',
                  },
                  message: {
                    type: 'string',
                    example: 'Error interno del servidor.',
                  },
                },
              },
            ],
          },
        },
      },
    },
  },
} as const;

export const openApiPaths = {
  '/api/v1/files/signed-url': {
    post: {
      operationId: 'createSignedUrl',
      summary: 'Generate temporary download signed URL',
      description:
        'Generates a time-limited signed URL to download a private object from R2 without exposing the bucket publicly.',
      tags: ['Archivos'],
      requestBody: {
        required: true,
        description: 'JSON body with the object key and the requested expiration in seconds.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SignedUrlRequest' },
            examples: {
              default: {
                summary: 'Generar URL firmada temporal',
                value: {
                  key: 'privados/B08N5W/factura.pdf',
                  expiresIn: 900,
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Temporary signed URL generated successfully.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SignedUrlResponse' },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/v1/files/import-from-url': {
    post: {
      operationId: 'importFileFromUrl',
      summary: 'Import file from URL',
      description:
        'Downloads an allowed remote image and uploads it into the configured R2 bucket under the provided key.',
      tags: ['Archivos'],
      requestBody: {
        required: true,
        description: 'JSON body with the remote URL and destination key in R2.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ImportFromUrlRequest' },
            examples: {
              default: {
                summary: 'Importar imagen remota',
                value: {
                  url: 'https://images-na.ssl-images-amazon.com/images/I/71abc12345L._AC_SL1500_.jpg',
                  key: 'productos/B08N5W/importada.jpg',
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Remote image imported and uploaded successfully.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UploadResponse' },
            },
          },
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/RemoteFetchForbidden' },
        '413': { $ref: '#/components/responses/RemoteFetchPayloadTooLarge' },
        '415': { $ref: '#/components/responses/RemoteFetchUnsupportedMediaType' },
        '502': { $ref: '#/components/responses/RemoteFetchBadGateway' },
      },
    },
  },
} as const;
