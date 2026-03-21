# r2-service

Microservicio HTTP para gestión de archivos en **Cloudflare R2**. Expone una API REST que permite subir, descargar, eliminar y listar objetos en un bucket R2, actuando como única capa de acceso al almacenamiento de archivos.

---

## Stack tecnológico

| Capa            | Tecnología                    |
|-----------------|-------------------------------|
| Runtime         | Node.js 20+                   |
| Lenguaje        | TypeScript 5+ (`strict: true`) |
| Framework HTTP  | [Hono](https://hono.dev)      |
| Storage         | Cloudflare R2 (AWS S3 SDK v3) |
| Validación      | Zod                           |
| Testing         | Vitest                        |
| Package manager | pnpm                          |

---

## Requisitos

- **Node.js** 20 o superior
- **pnpm** 10+ (`npm install -g pnpm`)
- Una cuenta de **Cloudflare** con un bucket R2 creado y credenciales de API generadas

---

## Configuración

Copia el archivo de ejemplo y rellena las variables:

```bash
cp .env.example .env
```

| Variable            | Descripción                                         |
|---------------------|-----------------------------------------------------|
| `R2_ACCOUNT_ID`     | ID de cuenta de Cloudflare                          |
| `R2_ACCESS_KEY_ID`  | Access Key ID del token de R2                       |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key del token de R2              |
| `R2_BUCKET_NAME`    | Nombre del bucket R2                                |
| `R2_PUBLIC_URL`     | URL pública del bucket (opcional)                   |
| `CF_API_TOKEN`      | Token de la API REST de Cloudflare (administración) |
| `PORT`              | Puerto del servidor (default: `3000`)               |
| `NODE_ENV`          | Entorno de ejecución (`development` / `production`) |
| `API_KEY`           | Clave de acceso al microservicio                    |

---

## Instalación y ejecución

```bash
# Instalar dependencias
pnpm install

# Modo desarrollo (hot reload)
pnpm dev

# Compilar para producción
pnpm build

# Ejecutar build compilado
pnpm start
```

---

## Testing

```bash
# Ejecutar tests
pnpm test

# Con reporte de cobertura
pnpm test:coverage
```

---

## API

Todas las rutas requieren el header `x-api-key` con la clave configurada en `API_KEY`.

| Método   | Ruta           | Descripción                                  |
|----------|----------------|----------------------------------------------|
| `POST`   | `/files/:key`  | Sube un archivo al bucket                    |
| `GET`    | `/files/:key`  | Descarga un archivo del bucket               |
| `DELETE` | `/files/:key`  | Elimina un archivo del bucket                |
| `GET`    | `/files`       | Lista archivos (query param opcional: `prefix`) |

---

## Estructura del proyecto

```
r2-service/
├── src/
│   ├── config/        # Variables de entorno y cliente R2
│   ├── errors/        # Clases de error personalizadas (AppError, etc.)
│   ├── middleware/    # Middlewares de Hono (autenticación, logging)
│   ├── routes/        # Definición de rutas HTTP
│   ├── schemas/       # Esquemas Zod para validación de inputs
│   ├── services/      # Lógica de negocio (R2Service)
│   ├── types/         # Tipos TypeScript compartidos
│   └── index.ts       # Entry point
├── test/              # Tests unitarios e integración (Vitest)
├── .env.example       # Plantilla de variables de entorno
├── package.json
└── tsconfig.json
```

---

## Lo que este servicio NO hace

- No accede a bases de datos.
- No transforma ni procesa imágenes.
- No gestiona sesiones ni tokens de usuarios finales.
- No conoce la existencia de otros servicios del sistema.
