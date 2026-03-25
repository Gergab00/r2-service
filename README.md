# r2-service

## 1. Título y descripción

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**[📋 Changelog](CHANGELOG.md)** • [Releases](../../releases) • [Issues](../../issues)

Microservicio HTTP para gestionar archivos en Cloudflare R2 mediante una API REST segura con API Key.

r2-service es un servicio especializado que centraliza el CRUD de objetos en un bucket R2 para evitar que otras piezas del sistema hablen directo con el storage. Su responsabilidad única es exponer endpoints de subida, descarga, borrado y listado de archivos, validando entradas y estandarizando errores de dominio. Este servicio no accede a base de datos, no conoce otros servicios y no procesa imágenes.

## 2. Stack tecnológico

| Capa | Tecnología | Versión | Propósito |
|:-----|:-----------|:--------|:----------|
| Runtime | Node.js | 20+ | Ejecutar el servicio HTTP en entorno server-side. |
| Lenguaje | TypeScript | 5.x | Tipado estricto y mantenibilidad del código. |
| Framework HTTP | Hono | 4.12.8 | Definición de rutas, middleware y manejo de requests/responses. |
| SDK S3-compatible | AWS S3 SDK v3 | 3.1014.0 | Operaciones `PutObject`, `GetObject`, `DeleteObject`, `ListObjectsV2`, `HeadObject`. |
| Storage | Cloudflare R2 | Servicio gestionado | Persistencia de objetos y archivos. |
| Validación | Zod | 4.3.6 | Validación de variables de entorno y entradas HTTP. |
| Testing | Vitest | 4.1.0 | Pruebas unitarias y cobertura. |
| Package manager | pnpm | 8+ (repo en 10.32.1) | Instalación de dependencias y scripts. |
| Contenedores | Docker | 24+ recomendado | Empaquetado y despliegue en contenedor. |
| Dev runner TS | tsx | 4.21.0 | Ejecución en desarrollo con recarga en caliente. |

## 3. Requisitos previos

- Node.js 20+.
- pnpm 8+.
- Cuenta de Cloudflare con R2 habilitado.
- Bucket de R2 creado.
- API Token de R2 con permisos Object Read & Write.
- Docker (opcional, para despliegue).

## 4. Instalación

```bash
git clone https://github.com/tu-organizacion/r2-service.git
cd r2-service
pnpm install
cp .env.example .env
```

## 5. ⚙️ Configuración de variables de entorno

Configura el archivo `.env` usando como base `.env.example`.

| Variable | Descripción | Requerida | Default | Ejemplo |
|:---------|:------------|:----------|:--------|:--------|
| `R2_ACCOUNT_ID` | ID de cuenta de Cloudflare. | Sí | No | `1234567890abcdef1234567890abcdef` |
| `R2_ACCESS_KEY_ID` | Access Key ID del token R2. | Sí | No | `a1b2c3d4e5f6g7h8i9j0` |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key del token R2. | Sí | No | `xYz...clave-secreta...123` |
| `R2_BUCKET_NAME` | Nombre del bucket R2 objetivo. | Sí | No | `amazon-products-images` |
| `R2_PUBLIC_URL` | Base URL pública para construir URLs de salida. | No | Vacío | `https://pub-xxxxxxxx.r2.dev` |
| `PORT` | Puerto HTTP del servicio. | No | `3000` | `3000` |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`, `test`). | No | `development` | `development` |
| `LOG_LEVEL` | Nivel mínimo de logs estructurados (`debug`, `info`, `warn`, `error`). | No | `info` | `debug` |
| `API_KEY` | Clave usada por el header `x-api-key` (mínimo 32 chars). | Sí | No | `4f7f6f6d1c...` |
| `REMOTE_FETCH_ALLOWED_HOSTS` | Hosts remotos permitidos para descarga, separados por coma. | Sí | No | `images-na.ssl-images-amazon.com,m.media-amazon.com` |
| `REMOTE_FETCH_ALLOWED_MIME_TYPES` | MIME types aceptados en la respuesta remota, separados por coma. | Sí | No | `image/jpeg,image/png,image/webp` |
| `REMOTE_FETCH_MAX_BYTES` | Tamaño máximo en bytes del archivo remoto descargado. | Sí | No | `5242880` (5 MB) |
| `REMOTE_FETCH_TIMEOUT_MS` | Tiempo máximo en ms para la petición HTTP remota. | Sí | No | `10000` (10 s) |
| `REMOTE_FETCH_MAX_REDIRECTS` | Número máximo de redirecciones HTTP permitidas. | Sí | No | `3` |

Genera una API Key segura con Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ Nunca subas `.env` al repositorio. Contiene credenciales y secretos.

## 6. Cómo obtener las credenciales de Cloudflare R2

1. Entra a `https://dash.cloudflare.com`.
2. Selecciona tu cuenta y abre **R2 Object Storage**.
3. Crea un bucket (nombre recomendado: `amazon-products-images`).
4. Ve a **Manage R2 API Tokens**.
5. Crea un token con permisos **Object Read & Write**.
6. Copia `Account ID`, `Access Key ID` y `Secret Access Key` al archivo `.env`.

> ℹ️ Para `R2_PUBLIC_URL` puedes usar un dominio propio sobre R2 o una URL `r2.dev` pública, según tu estrategia de entrega de archivos.

## 7. 🚀 Arrancar el proyecto

Modo desarrollo:

```bash
pnpm dev
```

Modo producción:

```bash
pnpm build && pnpm start
```

Verificar que funciona:

```bash
curl http://localhost:3000/health
```

Respuesta esperada:

```json
{
	"status": "ok",
	"service": "r2-service",
	"timestamp": "2026-03-23T14:00:00.000Z"
}
```

Output esperado en consola al arrancar correctamente:

```json
{"service":"r2-service","env":"development","level":"info","message":"server.started","timestamp":"2026-03-23T14:00:00.000Z","port":3000}
```

## 8. 🛠️ Scripts disponibles

| Script | Comando | Descripción |
|:-------|:--------|:------------|
| `dev` | `tsx watch src/index.ts` | Arranca en desarrollo con recarga automática. |
| `build` | `tsc && tsc-alias` | Compila TypeScript a `dist/` y resuelve aliases. |
| `start` | `node dist/index.js` | Ejecuta la build de producción. |
| `release` | `semantic-release` | Calcula versión automáticamente, genera `CHANGELOG.md`, crea tag `vX.Y.Z` y release en GitHub. |
| `release:dry` | `semantic-release --dry-run` | Simula el release sin escribir cambios ni crear tags. |
| `test` | `vitest` | Ejecuta la suite de pruebas. |
| `test:coverage` | `vitest --coverage` | Ejecuta tests con reporte de cobertura. |
| `lint` | `eslint src --ext .ts` | Analiza estilo y reglas de calidad en `src`. |
| `typecheck` | `tsc --noEmit` | Valida tipos sin generar artefactos. |
| `prepare` | `husky` | Activa/instala hooks de Git al instalar dependencias. |
| `commitlint` | `commitlint --edit` | Valida el mensaje de commit contra Conventional Commits. |

## 8.1. Calidad de commits (Husky + Commitlint)

Este repositorio valida commits automáticamente mediante hooks de Git:

- `pre-commit`: ejecuta `pnpm run lint`.
- `commit-msg`: ejecuta `commitlint` sobre el mensaje del commit.

Si los hooks no están activos localmente, ejecuta:

```bash
pnpm run prepare
```

Reglas principales del mensaje de commit:

- Formato: `<type>: <subject>`.
- Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Header máximo: 100 caracteres.

## 8.2. Release automático (tag + changelog)

El repositorio usa `semantic-release` para automatizar versionado y changelog.

Flujo configurado:

- Trigger: `push` a rama `master` en GitHub Actions (`.github/workflows/release.yml`).
- Entrada: historial de commits con formato Conventional Commits.
- Salida automática:
	- Calcula siguiente versión semántica.
	- Genera/actualiza [`CHANGELOG.md`](CHANGELOG.md).
	- Crea commit `chore(release): x.y.z`.
	- Crea tag `vX.Y.Z`.
	- Publica release en GitHub.

### Versionado semántico

El versionado es **automático** basado en los tipos de commit Conventional Commits. La versión comienza en `1.0.0` y se incrementa según:

| Tipo de commit | Incrementa | Ejemplo | Resultado |
|:---|:---|:---|:---|
| `fix: ...` | PATCH | `fix(r2): corrige error al borrar archivo` | `1.0.0` → `1.0.1` |
| `feat: ...` | MINOR | `feat(api): agrega endpoint de descarga` | `1.0.0` → `1.1.0` |
| `BREAKING CHANGE` | MAJOR | `feat(api)!: rediseña formato de respuesta` | `1.0.0` → `2.0.0` |

**Ejemplos de commits para cada tipo de versión:**

Patch (1.0.0 → 1.0.1):
```
fix(auth): corrige validación de API Key
```

Minor (1.0.0 → 1.1.0):
```
feat(api): agrega soporte para presigned URLs
```

Major (1.0.0 → 2.0.0):
```
feat(api)!: cambia estructura de respuesta del upload

BREAKING CHANGE: el endpoint POST /files/:key ahora retorna {success, data} en lugar de {uploaded, metadata}
```

### Scripts de release

Para validar localmente sin publicar:

```bash
pnpm run release:dry
```

Para ejecutar release manualmente con versión específica (avanzado):

```bash
pnpm run release -- --release-as 2.0.0
```

> ⚠️ Si ejecutas `release:dry` fuera de GitHub Actions, exporta `GH_TOKEN` o `GITHUB_TOKEN` con un token válido para evitar el error `ENOGHTOKEN`.

## 9. Documentación interactiva (Scalar)

- URL: `http://localhost:3000/docs`.
- Disponible solo fuera de producción (`NODE_ENV != production`).
- En la UI, autentica requests agregando el header `x-api-key` con el valor de `API_KEY`.

> ℹ️ Cuando `NODE_ENV=production`, la ruta `/docs` no se expone.

## 10. 📡 Endpoints de la API

| Método | Ruta | Descripción | Auth requerida |
|:-------|:-----|:------------|:---------------|
| `GET` | `/health` | Estado de disponibilidad del servicio. | No |
| `GET` | `/api/v1/files` | Lista archivos en R2 (acepta `prefix`). | Sí (`x-api-key`) |
| `POST` | `/api/v1/files/:key` | Sube un archivo binario a R2. | Sí (`x-api-key`) |
| `GET` | `/api/v1/files/:key` | Descarga un archivo desde R2. | Sí (`x-api-key`) |
| `DELETE` | `/api/v1/files/:key` | Elimina un archivo de R2. | Sí (`x-api-key`) |

### GET /health

```bash
curl http://localhost:3000/health
```

```json
{
	"status": "ok",
	"service": "r2-service",
	"timestamp": "2026-03-23T14:00:00.000Z"
}
```

```bash
curl http://localhost:3000/healthz
```

```json
{
	"code": 404,
	"message": "Not Found"
}
```

### GET /api/v1/files

```bash
curl -H "x-api-key: TU_API_KEY" "http://localhost:3000/api/v1/files?prefix=productos/"
```

```json
{
	"success": true,
	"data": {
		"files": [
			{
				"key": "productos/demo/imagen.jpg",
				"publicUrl": "https://pub-xxxxxxxx.r2.dev/productos/demo/imagen.jpg",
				"size": 183452,
				"lastModified": "2026-03-23T14:02:21.000Z"
			}
		],
		"count": 1
	},
	"timestamp": "2026-03-23T14:20:44.000Z"
}
```

```bash
curl "http://localhost:3000/api/v1/files?prefix=productos/"
```

```json
{
	"code": "UNAUTHORIZED",
	"message": "API Key inválida o ausente.",
	"timestamp": "2026-03-23T14:25:00.000Z"
}
```

### POST /api/v1/files/:key

```bash
curl -X POST \
	-H "x-api-key: TU_API_KEY" \
	-H "Content-Type: application/octet-stream" \
	--data-binary "@./ejemplos/imagen.jpg" \
	"http://localhost:3000/api/v1/files/productos/demo/imagen.jpg?contentType=image/jpeg"
```

```json
{
	"success": true,
	"data": {
		"key": "productos/demo/imagen.jpg",
		"publicUrl": "https://pub-xxxxxxxx.r2.dev/productos/demo/imagen.jpg",
		"size": 183452,
		"contentType": "image/jpeg",
		"uploadedAt": "2026-03-23T14:12:58.000Z"
	},
	"timestamp": "2026-03-23T14:12:58.000Z"
}
```

```bash
curl -X POST --data-binary "@./ejemplos/imagen.jpg" "http://localhost:3000/api/v1/files/productos/demo/imagen.jpg"
```

```json
{
	"code": "UNAUTHORIZED",
	"message": "API Key inválida o ausente.",
	"timestamp": "2026-03-23T14:25:00.000Z"
}
```

### GET /api/v1/files/:key

```bash
curl -H "x-api-key: TU_API_KEY" "http://localhost:3000/api/v1/files/productos/demo/imagen.jpg" --output imagen.jpg
```

```json
{
	"success": true,
	"data": {
		"downloaded": true,
		"note": "La respuesta real es binaria; se guarda en el archivo indicado por --output."
	}
}
```

```bash
curl -H "x-api-key: TU_API_KEY" "http://localhost:3000/api/v1/files/productos/no-existe.jpg"
```

```json
{
	"code": "R2_NOT_FOUND",
	"message": "El archivo 'productos/no-existe.jpg' no existe en R2.",
	"timestamp": "2026-03-23T14:26:00.000Z"
}
```

### DELETE /api/v1/files/:key

```bash
curl -X DELETE -H "x-api-key: TU_API_KEY" "http://localhost:3000/api/v1/files/productos/demo/imagen.jpg"
```

```json
{
	"success": true,
	"data": {
		"key": "productos/demo/imagen.jpg",
		"deletedAt": "2026-03-23T14:18:11.000Z"
	},
	"timestamp": "2026-03-23T14:18:11.000Z"
}
```

```bash
curl -X DELETE -H "x-api-key: TU_API_KEY" "http://localhost:3000/api/v1/files/productos/no-existe.jpg"
```

```json
{
	"code": "R2_NOT_FOUND",
	"message": "El archivo 'productos/no-existe.jpg' no existe en R2.",
	"timestamp": "2026-03-23T14:26:00.000Z"
}
```

## 11. 📁 Estructura del proyecto

```text
r2-service/
├── .env.example                       # Plantilla oficial de variables de entorno.
├── .gitignore                         # Exclusiones de Git para secretos y artefactos.
├── README.md                          # Documentación principal del servicio.
├── package.json                       # Dependencias y scripts del proyecto.
├── pnpm-lock.yaml                     # Lockfile de pnpm para instalaciones reproducibles.
├── tsconfig.json                      # Configuración TypeScript (strict y aliases).
├── vitest.config.ts                   # Configuración de Vitest y cobertura.
├── coverage/                          # Reportes HTML/JSON/XML de cobertura de tests.
│   ├── base.css                       # Estilos del reporte HTML de cobertura.
│   ├── block-navigation.js            # Navegación del reporte HTML de cobertura.
│   ├── clover.xml                     # Reporte de cobertura formato Clover.
│   ├── coverage-final.json            # Resumen estructurado de cobertura.
│   ├── index.html                     # Entrada principal del reporte de cobertura.
│   ├── prettify.css                   # Estilos de resaltado para reporte HTML.
│   ├── prettify.js                    # Script de resaltado para reporte HTML.
│   ├── sorter.js                      # Ordenamiento de tablas en el reporte HTML.
│   ├── errors/                        # Detalle de cobertura por archivos de errores.
│   │   ├── AppError.ts.html           # Cobertura de src/errors/AppError.ts.
│   │   ├── index.html                 # Índice de cobertura de carpeta errors.
│   │   ├── index.ts.html              # Cobertura de src/errors/index.ts.
│   │   ├── R2DeleteError.ts.html      # Cobertura de src/errors/R2DeleteError.ts.
│   │   ├── R2NotFoundError.ts.html    # Cobertura de src/errors/R2NotFoundError.ts.
│   │   ├── R2UploadError.ts.html      # Cobertura de src/errors/R2UploadError.ts.
│   │   ├── UnauthorizedError.ts.html  # Cobertura de src/errors/UnauthorizedError.ts.
│   │   └── ValidationError.ts.html    # Cobertura de src/errors/ValidationError.ts.
│   └── services/                      # Detalle de cobertura por servicios.
│       ├── index.html                 # Índice de cobertura de carpeta services.
│       └── R2Service.ts.html          # Cobertura de src/services/R2Service.ts.
├── src/
│   ├── index.ts                       # Entrada del proceso Node, carga env e inicia servidor.
│   ├── config/
│   │   ├── env.ts                     # Validación Zod de variables de entorno.
│   │   ├── logger.ts                  # Logger estructurado central y serialización de errores.
│   │   ├── openapi.ts                 # Especificación OpenAPI base y componentes.
│   │   └── r2Client.ts                # Cliente S3 configurado para Cloudflare R2.
│   ├── errors/
│   │   ├── AppError.ts                # Clase base de errores de dominio.
│   │   ├── index.ts                   # Barrel de exportación de errores.
│   │   ├── R2DeleteError.ts           # Error de fallo al eliminar en R2.
│   │   ├── R2NotFoundError.ts         # Error cuando un objeto no existe en R2.
│   │   ├── R2UploadError.ts           # Error de fallo de subida a R2.
│   │   ├── UnauthorizedError.ts       # Error por API Key ausente o inválida.
│   │   └── ValidationError.ts         # Error de validación de entradas.
│   ├── middleware/
│   │   ├── auth.middleware.ts         # Validación de API Key con timingSafeEqual.
│   │   ├── error.middleware.ts        # Mapeo de errores a respuestas HTTP JSON.
│   │   ├── index.ts                   # Barrel de middlewares.
│   │   ├── logger.middleware.ts       # Logging estructurado de requests y métricas de respuesta.
│   │   └── request-context.middleware.ts # Generación y propagación de requestId por solicitud.
│   ├── routes/
│   │   ├── docs.routes.ts             # OpenAPI JSON y UI Scalar.
│   │   ├── files.routes.ts            # Endpoints CRUD de archivos en R2.
│   │   ├── health.routes.ts           # Endpoint de health check del servicio.
│   │   └── index.ts                   # Composición global de rutas y middlewares.
│   ├── schemas/
│   │   ├── delete.schema.ts           # Esquema Zod para DELETE /files/:key.
│   │   ├── download.schema.ts         # Esquema Zod para GET /files/:key.
│   │   ├── index.ts                   # Barrel de esquemas Zod.
│   │   ├── list.schema.ts             # Esquema Zod para query de listado.
│   │   └── upload.schema.ts           # Esquema Zod para upload y validación de key.
│   └── services/
│       └── R2Service.ts               # Servicio de dominio para operaciones en R2.
└── test/
		├── config/                        # Espacio reservado para tests de configuración.
		├── errors/                        # Espacio reservado para tests de errores.
		├── integration/                   # Tests de integración HTTP sobre el pipeline real de Hono.
		│   	└── import-from-url.routes.test.ts # Contrato HTTP del endpoint import-from-url con app.request.
		└── unit/
				├── error.middleware.test.ts     # Tests del middleware de errores y serialización de fallos.
				├── logger.middleware.test.ts    # Tests de logging request/response con requestId.
				├── R2Service.test.ts          # Tests unitarios de R2Service con SDK mockeado.
				└── RemoteFileFetcherService.test.ts # Tests unitarios del descargador remoto con DNS/fetch mockeados.
```

## 12. Convenciones de código

- TypeScript con `strict: true` y sin `any`.
- `async/await` siempre; no usar `.then()` ni `.catch()` encadenados.
- Errores de dominio siempre con `AppError` y subclases.
- Validación con Zod antes de invocar la capa de servicio.
- Una responsabilidad por función y por clase.
- JSDoc obligatorio en funciones y métodos públicos.

## 13. 🧪 Testing

Ejecutar toda la suite:

```bash
pnpm test
```

Ver cobertura:

```bash
pnpm test:coverage
```

Suites actuales:

- `test/unit/R2Service.test.ts`
	- Componente probado: `R2Service`, encargado del CRUD sobre Cloudflare R2 mediante AWS S3 SDK v3.
	- Comportamiento crítico que protege: que el servicio sanee claves y prefijos, traduzca fallos esperados del SDK a errores de dominio y construya respuestas consistentes sin depender de R2 real.
	- Dependencias aisladas con mocks: `@config/r2Client.js` mediante `sendMock` para simular respuestas del SDK y `@config/env.js` para controlar `R2_BUCKET_NAME` y `R2_PUBLIC_URL`.
	- Escenarios cubiertos: upload exitoso, sanitización de `key`, fallo de subida mapeado a `R2UploadError`, ausencia de `R2_PUBLIC_URL`, lectura exitosa, `R2NotFoundError` por `NoSuchKey` o `404`, propagación de errores inesperados, borrado exitoso, borrado de archivo inexistente, fallo de delete mapeado, listado con resultados, listado vacío, envío de `prefix`, descarte de objetos sin `Key`, sanitización de `prefix`, ausencia de URL pública, existencia positiva, inexistencia y sanitización en `fileExists`.
	- Garantías de seguridad de la suite: evita regresiones en sanitización contra path traversal para `key` y `prefix`, y asegura que los errores expuestos al resto del servicio sigan siendo errores de dominio controlados en lugar de filtrar fallos crudos del SDK.
	- Comando individual:

```bash
pnpm vitest run test/unit/R2Service.test.ts
```

- `test/unit/logger.middleware.test.ts`
	- Componente probado: `loggerMiddleware` junto con `requestContextMiddleware` para registrar entrada/salida de requests con correlación por `requestId`.
	- Comportamiento crítico que protege: que el cierre de cada request registre `status`, `durationMs` y `requestId`, y que los errores HTTP queden clasificados con nivel `error`.
	- Dependencias aisladas con mocks: `@config/env.js` para controlar `LOG_LEVEL` y `NODE_ENV`, y spies sobre `console.debug`, `console.info` y `console.error` para capturar eventos de log estructurado.
	- Escenarios cubiertos: respuesta 200 con requestId propagado desde header y respuesta 500 con emisión de `request.end` en nivel `error`.
	- Garantías de seguridad de la suite: valida la trazabilidad por request para auditoría de fallos y evita regresiones donde se pierda la correlación entre petición, respuesta y error operativo.
	- Comando individual:

```bash
pnpm vitest run test/unit/logger.middleware.test.ts
```

- `test/unit/error.middleware.test.ts`
	- Componente probado: `errorMiddleware` integrado con `requestContextMiddleware` para mapear errores de dominio/validación y emitir logs enriquecidos.
	- Comportamiento crítico que protege: que errores de dominio con `cause` se serialicen en logs y que errores de validación mantengan respuesta `400` consistente con logging en nivel `warn`.
	- Dependencias aisladas con mocks: `@config/env.js` para fijar `LOG_LEVEL`/`NODE_ENV` y spies sobre `console.warn`/`console.error` para verificar contenido estructurado del log.
	- Escenarios cubiertos: `R2UploadError` con causa anidada en respuesta 500 y `ValidationError` con detalles de entrada en respuesta 400.
	- Garantías de seguridad de la suite: asegura que el servicio conserve detalle técnico interno para diagnóstico sin romper el contrato HTTP de errores controlados al cliente.
	- Comando individual:

```bash
pnpm vitest run test/unit/error.middleware.test.ts
```

- `test/unit/RemoteFileFetcherService.test.ts`
	- Componente probado: `RemoteFileFetcherService`, responsable de descargar recursos remotos con allowlist, validación DNS anti-SSRF, control manual de redirects y validaciones de MIME y tamaño.
	- Comportamiento crítico que protege: que ninguna relajación en allowlist, bloqueo de IPs privadas, tipo MIME permitido, límite de bytes o validación de redirects pase inadvertida.
	- Dependencias aisladas con mocks: `node:dns/promises` para controlar resoluciones DNS, `fetch` global para simular respuestas remotas y `@config/env.js` para fijar hosts permitidos, MIME aceptados, tamaño máximo, timeout y máximo de redirects.
	- Escenarios cubiertos: host fuera de allowlist, hostname permitido que resuelve a IP privada, respuesta con MIME inválido, body que supera el tamaño máximo, redirect hacia host no permitido y descarga exitosa con `buffer`, `contentType`, `finalUrl` y `size`.
	- Garantías de seguridad de la suite: endurece la defensa SSRF validando hostname y resolución DNS antes de descargar, impide aceptar contenido remoto fuera de política y garantiza que el límite de tamaño siga aplicándose incluso durante la lectura del body.
	- Comando individual:

```bash
pnpm vitest run test/unit/RemoteFileFetcherService.test.ts
```

- `test/integration/import-from-url.routes.test.ts`
	- Componente probado: el contrato HTTP de `POST /api/v1/files/import-from-url` montado sobre el `app` real de Hono en `src/routes/index.ts`, incluyendo `files.routes`, `authMiddleware` y `errorMiddleware`.
	- Comportamiento crítico que protege: que el endpoint responda de forma consistente con `201`, `400` y `401` dentro del pipeline real de rutas y middleware, sin saltarse autenticación, parseo JSON ni manejo centralizado de errores.
	- Dependencias aisladas con mocks: `@config/env.js` para fijar API key y configuración requerida por el arranque del pipeline, e `ImportFileFromUrlUseCase` para evitar descargas remotas y subidas reales a R2.
	- Escenarios cubiertos: importación exitosa con body válido, rechazo de body con JSON inválido y rechazo por ausencia del header `x-api-key`.
	- Garantías de seguridad de la suite: asegura que el endpoint siga exigiendo autenticación antes de tocar el caso de uso, que los errores de entrada inválida se traduzcan a `400` controlado y que ninguna prueba necesite red real ni almacenamiento externo para validar el contrato HTTP.
	- Comando individual:

```bash
pnpm vitest run test/integration/import-from-url.routes.test.ts
```

- `test/config/`: carpeta preparada para futuras pruebas de validación y configuración.
- `test/errors/`: carpeta preparada para futuras pruebas de mapeo de errores de dominio.

Nota de aislamiento:

- Ninguna suite usa red real ni R2 real; todas las dependencias externas se aíslan con `vi.mock` o `vi.stubGlobal`, incluso en integración HTTP cuando se prueba el pipeline real con `app.request`.

## 14. 🐳 Despliegue con Docker

Construir imagen:

```bash
docker build -t r2-service .
```

Ejecutar contenedor con `.env`:

```bash
docker run --env-file .env -p 3000:3000 r2-service
```

Ejecutar con docker-compose:

```bash
docker-compose up -d
```

> ℹ️ Usa un usuario non-root en la imagen (por ejemplo, `USER node`) para reducir superficie de riesgo en runtime.

## 15. 🔒 Seguridad

- El servicio protege endpoints de API con `x-api-key`.
- La clave se genera de forma segura con `crypto.randomBytes` y se envía en el header `x-api-key`.
- La comparación se hace con `timingSafeEqual` para mitigar timing attacks.
- El servicio nunca debe loguear: headers de autorización, credenciales ni contenido de archivos.
- Las keys de objetos se sanitizan para prevenir path traversal.
- Las rutas de documentación no están disponibles en producción.

## 16. Solución de problemas comunes

| Error | Causa probable | Solución |
|:------|:---------------|:---------|
| `ZodError` al arrancar | `.env` incompleto o variable faltante/invalidada. | Verifica todas las variables requeridas y sus formatos en la sección de configuración. |
| `401` en todos los endpoints protegidos | `API_KEY` incorrecto o header ausente. | Envía `x-api-key` con el valor exacto de `API_KEY` de tu `.env`. |
| `404` en `/docs` | `NODE_ENV=production`; docs deshabilitado. | Cambia a `NODE_ENV=development` para entorno local. |
| Error de conexión a R2 | Credenciales incorrectas o bucket inexistente. | Revisa `R2_ACCOUNT_ID`, claves R2 y existencia real de `R2_BUCKET_NAME`. |
| `tsx` no encuentra `.env` | Falta `import "dotenv/config"` en `src/index.ts`. | Asegura que la importación exista al inicio del entrypoint. |

## 17. Contribución

- Rama principal: `master`.
- Flujo: crear rama de trabajo, desarrollar cambios, abrir PR hacia `main`.
- Conventional Commits requeridos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.
- Antes del PR ejecuta:

```bash
pnpm lint
pnpm typecheck
```

## 18. Licencia

MIT.
