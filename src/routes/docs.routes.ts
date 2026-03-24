import { Hono, type Context } from 'hono';
import { Scalar } from '@scalar/hono-api-reference';

import { openApiComponents, openApiSpec } from '../config/openapi.js';

// ─── Private helpers ───────────────────────────────────────────────────────────

/**
 * Builds the complete OpenAPI `paths` object for r2-service.
 *
 * Each path is documented with its parameters, request body (where applicable),
 * and all expected responses referenced via `$ref` to the shared components
 * defined in `openApiComponents`.
 *
 * @returns A `Record<string, unknown>` compatible with the OpenAPI 3.1 `paths` field.
 */
function buildPaths(): Record<string, unknown> {
  return {
    // ─── Sistema ──────────────────────────────────────────────────────────────
    '/health': {
      get: {
        operationId: 'getHealth',
        summary: 'Health check',
        description: 'Returns the current operational status of the service. Does not require authentication.',
        tags: ['Sistema'],
        security: [],
        responses: {
          '200': {
            description: 'Service is healthy.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    status: {
                      type: 'string',
                      example: 'ok',
                    },
                    service: {
                      type: 'string',
                      example: 'r2-service',
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                      example: '2026-03-23T14:00:00.000Z',
                    },
                  },
                  required: ['status', 'service', 'timestamp'],
                },
              },
            },
          },
        },
      },
    },

    // ─── Archivos ─────────────────────────────────────────────────────────────
    '/api/v1/files': {
      get: {
        operationId: 'listFiles',
        summary: 'List files',
        description: 'Returns a paginated list of all files stored in the R2 bucket, optionally filtered by prefix.',
        tags: ['Archivos'],
        parameters: [
          {
            name: 'prefix',
            in: 'query',
            required: false,
            description: 'Filter results to keys that begin with this prefix.',
            schema: {
              type: 'string',
              example: 'productos/',
            },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Maximum number of files to return per page.',
            schema: {
              type: 'integer',
              default: 100,
              minimum: 1,
              maximum: 1000,
              example: 50,
            },
          },
          {
            name: 'cursor',
            in: 'query',
            required: false,
            description: 'Opaque pagination cursor returned by the previous response.',
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'File list retrieved successfully.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ListResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/v1/files/{key}': {
      post: {
        operationId: 'uploadFile',
        summary: 'Upload a file',
        description: 'Uploads a binary file to the R2 bucket under the specified key.',
        tags: ['Archivos'],
        parameters: [
          {
            name: 'key',
            in: 'path',
            required: true,
            description: 'Storage key (path) for the file within the bucket.',
            schema: {
              type: 'string',
              minLength: 1,
              maxLength: 512,
              example: 'productos/B08N5W/principal.jpg',
            },
          },
          {
            name: 'contentType',
            in: 'query',
            required: false,
            description: 'MIME type of the file being uploaded. Defaults to `application/octet-stream`.',
            schema: {
              type: 'string',
              enum: [
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/gif',
                'image/svg+xml',
                'application/pdf',
                'application/octet-stream',
                'text/plain',
                'text/html',
                'text/css',
                'application/json',
                'video/mp4',
                'audio/mpeg',
              ],
              default: 'application/octet-stream',
            },
          },
        ],
        requestBody: {
          required: true,
          description: 'Raw binary content of the file to upload.',
          content: {
            'application/octet-stream': {
              schema: {
                type: 'string',
                format: 'binary',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'File uploaded successfully.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },

      get: {
        operationId: 'downloadFile',
        summary: 'Download a file',
        description: 'Streams the binary content of a file stored in the R2 bucket.',
        tags: ['Archivos'],
        parameters: [
          {
            name: 'key',
            in: 'path',
            required: true,
            description: 'Storage key (path) of the file to download.',
            schema: {
              type: 'string',
              example: 'productos/B08N5W/principal.jpg',
            },
          },
        ],
        responses: {
          '200': {
            description: 'File content returned as a binary stream.',
            content: {
              'application/octet-stream': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },

      delete: {
        operationId: 'deleteFile',
        summary: 'Delete a file',
        description: 'Permanently removes a file from the R2 bucket.',
        tags: ['Archivos'],
        parameters: [
          {
            name: 'key',
            in: 'path',
            required: true,
            description: 'Storage key (path) of the file to delete.',
            schema: {
              type: 'string',
              example: 'productos/B08N5W/principal.jpg',
            },
          },
        ],
        responses: {
          '200': {
            description: 'File deleted successfully.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DeleteResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

/**
 * Hono router that exposes the OpenAPI 3.1 specification and the interactive
 * Scalar API reference UI.
 *
 * Routes:
 * - `GET /openapi.json` — Returns the complete OpenAPI 3.1 spec as JSON,
 *   composed from `openApiSpec`, `openApiComponents`, and `buildPaths()`.
 * - `GET /docs`         — Serves the Scalar interactive API reference UI
 *   pointing to `/openapi.json`.
 *
 * This router contains no business logic and must not be mounted in production.
 * Mounting is controlled conditionally by `src/routes/index.ts` based on `NODE_ENV`.
 */
export const docsRoutes = new Hono();

docsRoutes.get('/openapi.json', (c: Context) => {
  const spec = {
    ...openApiSpec,
    components: {
      ...openApiSpec.components,
      schemas: openApiComponents.schemas,
      responses: openApiComponents.responses,
    },
    paths: buildPaths(),
  };

  return c.json(spec);
});

docsRoutes.get(
  '/docs',
  Scalar({
    url: '/openapi.json',
    pageTitle: 'r2-service API',
    theme: 'purple',
    layout: 'modern',
    defaultHttpClient: {
      targetKey: 'node',
      clientKey: 'axios',
    },
  }),
);
