## [1.1.1](https://github.com/Gergab00/r2-service/compare/v1.1.0...v1.1.1) (2026-03-25)


### Bug Fixes

* **fetcher:** cancelar reader antes de lanzar error por tamaño máximo excedido ([5adae0e](https://github.com/Gergab00/r2-service/commit/5adae0e770c9138f21c324e3211779ac8f7c2c5f))
* **ssrf:** anclar IP resuelta en fetchOnce para prevenir DNS rebinding ([0dac21f](https://github.com/Gergab00/r2-service/commit/0dac21f753d49099bc1bc2aab5e9646e3adcaeb2))

# [1.1.0](https://github.com/Gergab00/r2-service/compare/v1.0.0...v1.1.0) (2026-03-25)


### Bug Fixes

* **errors:** corregir código de estado HTTP para tipo MIME no permitido en importación remota ([7724981](https://github.com/Gergab00/r2-service/commit/7724981e89664cf6964a3158bce3a6a02ee3af09))
* **tests:** agregar referencia de tipos de Node en R2Service.test.ts ([dcdd4dd](https://github.com/Gergab00/r2-service/commit/dcdd4dd894a5cbf55439b59cb56073cbc3d24e05))


### Features

* **docs:** actualizar instrucciones de copilot para la documentación de pruebas en README.md ([f2d560e](https://github.com/Gergab00/r2-service/commit/f2d560e1aac54ec74142e99f2fe4a0aeddb8c859))
* **docs:** actualizar README.md con detalles sobre pruebas de integración y unitarias ([0b42986](https://github.com/Gergab00/r2-service/commit/0b4298631166b13e0b697fd5d902de6116951ebd))
* **env:** agrega variables de configuración para descarga remota de imágenes ([d82829c](https://github.com/Gergab00/r2-service/commit/d82829c89112129cdf1c6cb2de4baf7d33e9a797))
* **errors:** agrega manejo de errores de validación en el middleware ([3bd3352](https://github.com/Gergab00/r2-service/commit/3bd33523f9b26a7174171d58743568d88263aaf4))
* **errors:** agrega nuevas clases de error para manejo de descargas remotas ([cc74840](https://github.com/Gergab00/r2-service/commit/cc748407939daf79c47c9593e982017adc06b857))
* **fetcher:** implement RemoteFileFetcherService para descarga segura de archivos remotos ([23c6cf7](https://github.com/Gergab00/r2-service/commit/23c6cf7fdbb09ab92ff0fe3a7c41f5294a08e628))
* **import:** implementar manejo de importación de archivos desde URL ([5444222](https://github.com/Gergab00/r2-service/commit/544422236ec2d7b973587aaa65d4fffcfbdb56e6))
* **openapi:** agregar esquemas de respuesta de error y solicitud de importación desde URL ([4504cb1](https://github.com/Gergab00/r2-service/commit/4504cb1a7d697c48194eb7410adb71488842880b))
* **schema:** agrega esquema de validación para importación remota por URL ([615cbd9](https://github.com/Gergab00/r2-service/commit/615cbd9c47a94d80f6ee30eeadcfd4629e1dc64b))
* **tests:** agregar archivo tsconfig para configuración de pruebas ([220d716](https://github.com/Gergab00/r2-service/commit/220d7164df949e53388ea1ca295d0928fc9f4333))
* **tests:** agregar pruebas de integración para la importación de archivos desde URL ([3f922fc](https://github.com/Gergab00/r2-service/commit/3f922fc476a19a5921acd7ba45bf6a38ea6c316e))
* **tests:** agregar pruebas unitarias para RemoteFileFetcherService ([478b546](https://github.com/Gergab00/r2-service/commit/478b5463820a281a93684b9b597a65d72ae99aea))
* **use-case:** agregar caso de uso para importar archivos remotos a R2 ([4106a86](https://github.com/Gergab00/r2-service/commit/4106a865e75bf5e8684213c10a4c0ce083bab78b))

# 1.0.0 (2026-03-24)


### Bug Fixes

* **ci:** remove version conflict in pnpm action setup ([0c1fa0d](https://github.com/Gergab00/r2-service/commit/0c1fa0dfff2d1004899137b2a465add61c06c3ba))


### Features

* **ci:** configura release automatico con semantic-release ([97c4d4c](https://github.com/Gergab00/r2-service/commit/97c4d4c788cd8dda27b19154249d34ece1c32fc2))
* **openapi:** agrega especificacion base y componentes reutilizables ([d43f044](https://github.com/Gergab00/r2-service/commit/d43f04492e4766176d834491bba7a22193005444))
* **openapi:** agrega rutas de especificacion y referencia Scalar ([ccf59c1](https://github.com/Gergab00/r2-service/commit/ccf59c1980ce840dfbcd7d3c95dc07e87677c3c0))
