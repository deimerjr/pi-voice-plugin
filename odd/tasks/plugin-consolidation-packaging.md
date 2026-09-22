# Feature: Consolidación, Documentación y Empaquetado del Plugin Pi Voice v1.1.0

Consolidar todas las ramas de trabajo en la rama `main`, actualizar la documentación completa en `README.md` (modo solo decisiones, traducción al español de subagentes, formulario de landing page y consumo de tokens 100% offline), incrementar versión a `1.1.0` en `package.json`, verificar todas las pruebas y generar el paquete distribuible `.tgz`.

## Tasks
- [ ] Task 1: Actualizar `README.md` con las nuevas capacidades (Modo Solo Decisiones y Permisos, Traducción Integral de Subagentes, Formulario de Landing Page y aclaración de cero consumo de tokens con Kokoro)
- [ ] Task 2: Incrementar versión a `1.1.0` en `package.json`
- [ ] Task 3: Ejecutar pruebas completas (`npm test` y `node --test landing/landing.test.js`) asegurando 140/140 pasando
- [ ] Task 4: Mergear la cadena de ramas a `main` y registrar commit de consolidación y release
- [ ] Task 5: Generar el paquete tarball `.tgz` con `npm pack` y verificar su integridad y contenido
