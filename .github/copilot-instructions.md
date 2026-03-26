# Copilot Instructions – r2-service

## Rol
Eres un desarrollador senior especializado en **TypeScript**, **Node.js** y **Cloudflare R2**.
Trabajas en un microservicio llamado `r2-service` cuya única responsabilidad es gestionar
archivos en un bucket de Cloudflare R2.

---

## Stack tecnológico

| Capa           | Tecnología                          |
|----------------|-------------------------------------|
| Runtime        | Node.js 20+                         |
| Lenguaje       | TypeScript 5+ (`strict: true`)       |
| Framework HTTP | [Hono](https://hono.dev)            |
| Storage        | Cloudflare R2 (AWS S3 SDK v3)       |
| Validación     | Zod                                 |
| Testing        | Vitest                              |
| Package manager| pnpm                                |

---

## Estructura del proyecto

```
r2-service/
├── src/
│   ├── config/          # Variables de entorno y configuración R2
│   ├── errors/          # Clases de error personalizadas
│   ├── middleware/       # Middlewares de Hono (auth, logging, etc.)
│   ├── routes/           # Definición de rutas Hono
│   ├── schemas/          # Esquemas Zod para validación de inputs
│   ├── services/         # Lógica de negocio (R2Service)
│   └── index.ts          # Entry point
├── test/                 # Tests unitarios y de integración (Vitest)
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Reglas de TypeScript

- Siempre `strict: true` en `tsconfig.json`.
- Tipos explícitos en todos los parámetros, retornos y variables.
- **Nunca usar `any`**. Usa `unknown` si el tipo real es incierto y luego narrowing.
- Preferir `type` sobre `interface` para objetos simples y uniones.
- Usar `interface` solo cuando se necesite herencia o implementación.
- Exportar los tipos desde un barril (`src/types/index.ts`) cuando sean compartidos.

```typescript
// ✅ Correcto
async function uploadFile(key: string, body: Buffer): Promise<UploadResult> { ... }

// ❌ Incorrecto
async function uploadFile(key: any, body: any): Promise<any> { ... }
```

---

## Reglas de código general

### Async/Await
- Usar **siempre** `async/await`.
- **Nunca** usar `.then()/.catch()` encadenados ni callbacks.

```typescript
// ✅ Correcto
const result = await r2Client.send(command);

// ❌ Incorrecto
r2Client.send(command).then(result => { ... }).catch(err => { ... });
```

### Principio de responsabilidad única
- Cada función hace **una sola cosa**.
- Cada clase tiene **una sola razón para cambiar**.
- Las rutas de Hono solo orquestan: reciben input, llaman al service, retornan respuesta.
- Los services encapsulan toda la lógica de interacción con R2.

### Variables de entorno
- **Nunca hardcodear** credenciales, URLs ni configuración sensible.
- Toda config se lee desde variables de entorno, validadas con Zod al arrancar.
- El archivo `src/config/env.ts` es el único punto de acceso a `process.env`.

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_KEY: z.string().min(32),
});

export const env = envSchema.parse(process.env);
```

- Mantener `.env.example` sincronizado con `src/config/env.ts`.
- No documentar ni usar variables que no existan en runtime (por ejemplo `DOCS_ENABLED` o `CF_API_TOKEN`).

---

## Manejo de errores

- Usar **siempre** clases de error personalizadas. Nunca lanzar `new Error('string genérico')`.
- Todas las clases de error extienden una clase base `AppError`.
- Los errores conocidos de R2/S3 deben mapearse a errores de dominio propios.

```typescript
// src/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// src/errors/R2NotFoundError.ts
export class R2NotFoundError extends AppError {
  constructor(key: string) {
    super(`El archivo '${key}' no existe en R2.`, 404, 'R2_NOT_FOUND');
  }
}

// src/errors/R2UploadError.ts
export class R2UploadError extends AppError {
  constructor(key: string, cause?: unknown) {
    super(`No se pudo subir el archivo '${key}'.`, 500, 'R2_UPLOAD_FAILED');
    this.cause = cause;
  }
}
```

- Centralizar el manejo de errores en un middleware de Hono:

```typescript
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ code: err.code, message: err.message }, err.statusCode);
  }
  // Error inesperado: no exponer detalles internos
  return c.json({ code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' }, 500);
});
```

---

## Validación con Zod

- **Validar siempre** todos los inputs: params de ruta, query strings, headers y body.
- Los esquemas Zod viven en `src/schemas/`.
- Usar `.parse()` dentro de los handlers de Hono; los errores de Zod se capturan en el middleware global.

```typescript
// src/schemas/upload.schema.ts
import { z } from 'zod';

export const uploadParamsSchema = z.object({
  key: z.string().min(1).max(1024),
});

export const uploadQuerySchema = z.object({
  contentType: z.string().default('application/octet-stream'),
});
```

```typescript
// En el handler de Hono
app.post('/files/:key', async (c) => {
  const { key } = uploadParamsSchema.parse(c.req.param());
  const { contentType } = uploadQuerySchema.parse(c.req.query());
  // ...
});
```

---

## Interacción con Cloudflare R2

- Usar el cliente AWS S3 SDK v3 (`@aws-sdk/client-s3`).
- El cliente S3 se instancia **una sola vez** y se exporta desde `src/config/r2Client.ts`.
- Toda operación con R2 pasa exclusivamente por `src/services/R2Service.ts`.

```typescript
// src/config/r2Client.ts
import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});
```

### Operaciones disponibles del servicio

| Método                       | Comando S3              | Descripción                        |
|------------------------------|-------------------------|------------------------------------|
| `uploadFile(key, body, type)`| `PutObjectCommand`      | Sube un archivo al bucket          |
| `getFile(key)`               | `GetObjectCommand`      | Recupera un archivo del bucket     |
| `deleteFile(key)`            | `DeleteObjectCommand`   | Elimina un archivo del bucket      |
| `listFiles(prefix?)`         | `ListObjectsV2Command`  | Lista archivos con prefijo opcional|
| `fileExists(key)`            | `HeadObjectCommand`     | Verifica si un archivo existe      |

---

## Rutas HTTP (Hono)

| Método | Ruta             | Descripción                         |
|--------|------------------|-------------------------------------|
| POST   | `/api/v1/files/:key` | Sube un archivo                |
| GET    | `/api/v1/files/:key`  | Descarga un archivo            |
| DELETE | `/api/v1/files/:key`  | Elimina un archivo             |
| GET    | `/api/v1/files`       | Lista archivos (query: `prefix`) |

- Las rutas **no contienen lógica de negocio**.
- Retornar siempre respuestas con `Content-Type` explícito.
- Los errores se propagan como excepciones; el middleware `onError` los maneja.

---

## Documentación

- Documentar **todas** las funciones y métodos públicos con **JSDoc**.
- Incluir `@param`, `@returns` y `@throws` cuando aplique.
- Mantener `README.md` como documentación principal operativa del servicio.
- En cada cambio importante (nuevos endpoints, variables de entorno, scripts, seguridad o flujo de arranque), actualizar `README.md` en el mismo trabajo.
- Cada vez que se cree o modifique una suite de tests, actualizar la sección de testing de `README.md` en el mismo cambio.
- La documentación de cada suite de tests en `README.md` debe incluir siempre: qué componente se prueba, qué comportamiento crítico protege, qué dependencias se aíslan con mocks, qué escenarios cubre, qué garantías de seguridad da esa suite y el comando individual para ejecutarla.
- Verificar siempre consistencia entre `README.md`, `.env.example`, `package.json`, `src/config/env.ts` y `src/routes/`.

```typescript
/**
 * Sube un archivo al bucket de Cloudflare R2.
 *
 * @param key - Ruta/clave del objeto dentro del bucket.
 * @param body - Contenido del archivo en formato Buffer.
 * @param contentType - MIME type del archivo (e.g. `image/webp`).
 * @returns Metadata del objeto subido.
 * @throws {R2UploadError} Si la operación de subida falla.
 */
async uploadFile(key: string, body: Buffer, contentType: string): Promise<UploadResult> { ... }
```

---

## Testing con Vitest

- Cada service, middleware y helper tiene su propio archivo de test.
- Los tests de `R2Service` mockan el cliente S3; nunca llaman a R2 real.
- Usar `vi.mock()` para aislar dependencias externas.
- Los tests de integración HTTP deben ejercitar el pipeline real de rutas y middleware con `app.request`, pero siempre con dependencias externas stubbeadas o mockeadas.
- Cuando se agregue un archivo nuevo en `test/`, documentarlo en `README.md` con el formato obligatorio definido en la sección de documentación.
- Nombrar los tests con el patrón: `describe('R2Service') > it('debe subir el archivo correctamente')`.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { R2Service } from '../src/services/R2Service';
import { r2Client } from '../src/config/r2Client';

vi.mock('../src/config/r2Client');

describe('R2Service', () => {
  it('debe subir el archivo correctamente', async () => {
    // Arrange
    const mockSend = vi.fn().mockResolvedValue({});
    vi.mocked(r2Client.send).mockImplementation(mockSend);

    // Act & Assert
    await expect(service.uploadFile('img/test.webp', Buffer.from('data'), 'image/webp'))
      .resolves.not.toThrow();
  });
});
```

---

## Seguridad

- Este servicio **no maneja autenticación de usuarios finales**.
- El acceso al endpoint se protege mediante un **API Key** en el header `x-api-key`,
  validado por un middleware de Hono antes de cualquier ruta.
- La API Key se almacena en variable de entorno (`API_KEY`) y se compara con
  **comparación en tiempo constante** (`timingSafeEqual` de Node.js crypto) para
  prevenir timing attacks.
- **Nunca loguear** valores de headers de autorización, credenciales ni contenido de archivos.
- Las claves (`key`) de los objetos R2 deben sanitizarse para prevenir path traversal.

```typescript
// Santización de key para evitar path traversal
const safeKey = key.replace(/\.\.\//g, '').replace(/^\/+/, '');
```

---

## Lo que este servicio NO hace

- No accede a bases de datos.
- No conoce la existencia de otros servicios del sistema.
- No transforma, redimensiona ni procesa imágenes.
- No gestiona sesiones ni tokens de usuarios finales.
- No expone lógica de negocio más allá del CRUD de archivos en R2.

---

## Commits (Conventional Commits + Husky)

- Todos los mensajes de commit deben cumplir Conventional Commits y pasar `commitlint`.
- Formato obligatorio: `<type>(<scope>): <subject>`.
- Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- `type` siempre en minúsculas.
- `scope` opcional pero recomendado para cambios en rutas, servicios o configuraciones específicas.
- `subject` nunca vacío.
- Longitud máxima del header: 100 caracteres.
- Escribir mensajes de commit en español claro, orientados al cambio real.
- No usar mensajes genéricos como `update`, `changes` o `fix stuff`.
- No incluir firmas automáticas como `Generated by Copilot` o `Co-Authored-By` salvo que el usuario lo pida explícitamente.

Ejemplos válidos:

```text
feat(api): agrega validación de prefix en listado de archivos
fix(api): corrige manejo de error cuando R2 responde NoSuchKey
chore(ci): configura husky y commitlint para validar commits
docs(readme): actualiza README con flujo de pre-commit
```

---

## Engram Memory

Utiliza las instrucciones de Engram disponibles globalmente en Copilot para registrar:
- Decisiones de diseño relevantes a `r2-service`.
- Bugs encontrados y su solución.
- Patrones establecidos en el proyecto.
- Configuraciones de entorno verificadas.

Antes de iniciar cualquier tarea compleja, consulta la memoria con `mem_context` y `mem_search`
para recuperar contexto previo relevante de este servicio.
