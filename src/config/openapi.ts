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
      url: 'https://r2-service.tudominio.com',
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
            publicUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://cdn.tudominio.com/productos/B08N5W/principal.jpg',
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
          required: ['key', 'publicUrl', 'size', 'contentType', 'uploadedAt'],
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
                  publicUrl: {
                    type: 'string',
                    format: 'uri',
                    example: 'https://cdn.tudominio.com/productos/B08N5W/principal.jpg',
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
                required: ['key', 'publicUrl', 'size', 'lastModified'],
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
  },

  // responses
  responses: {
    Unauthorized: {
      description: 'Missing or invalid x-api-key header.',
      content: {
        'application/json': {
          schema: {
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
            required: ['code', 'message'],
          },
        },
      },
    },

    NotFound: {
      description: 'Requested object does not exist in R2.',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              code: {
                type: 'string',
                example: 'R2_NOT_FOUND',
              },
              message: {
                type: 'string',
                example: "El archivo 'productos/B08N5W/principal.jpg' no existe en R2.",
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                example: '2026-03-23T14:26:00.000Z',
              },
            },
            required: ['code', 'message'],
          },
        },
      },
    },

    ValidationError: {
      description: 'Request validation failed.',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR',
              },
              message: {
                type: 'string',
                example: 'Parametros invalidos en la solicitud.',
              },
              details: {
                type: 'array',
                items: {
                  type: 'string',
                  example: 'key: debe contener al menos 1 caracter.',
                },
                example: ['key: debe contener al menos 1 caracter.'],
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                example: '2026-03-23T14:27:00.000Z',
              },
            },
            required: ['code', 'message', 'details'],
          },
        },
      },
    },

    InternalError: {
      description: 'Unexpected internal server error.',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              code: {
                type: 'string',
                example: 'INTERNAL_ERROR',
              },
              message: {
                type: 'string',
                example: 'Error interno del servidor.',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                example: '2026-03-23T14:28:00.000Z',
              },
            },
            required: ['code', 'message'],
          },
        },
      },
    },
  },
} as const;
