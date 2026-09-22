# Feature: Suite Completa de Documentación Técnica del Repositorio

Diseño y redacción de la suite completa de documentación técnica del repositorio Pi Voice Plugin bajo los principios de Gentle AI Cognitive Doc Design (chunking, signposting, reconocimiento sobre memorización y progresión de disclosure).

## Tasks
- [x] Task 1: Crear `CHANGELOG.md` estructurado según estándar Keep a Changelog (versiones v1.0.0 y v1.1.0)
- [x] Task 2: Crear `CONTRIBUTING.md` con guías de contribución, filosofía de diseño, convenciones ODD y ejecución de pruebas
- [x] Task 3: Crear `docs/architecture.md` con diagrama de flujo, ciclo de vida de eventos Pi, DecisionGate, traducción de subagentes y adaptadores
- [x] Task 4: Crear `docs/concurrency.md` con detalles técnicos de cerrojos inter-proceso POSIX, cola FIFO, modo interrupción y modo foco
- [x] Task 5: Crear `docs/configuration.md` con referencia completa de `voice.json`, variables de entorno y comandos CLI
- [x] Task 6: Crear `docs/kokoro-offline.md` con guía de servicio systemd, clonación de voces neuronales a .npy y catálogo de voces locales
- [x] Task 7: Actualizar `README.md` con enlaces directos a la nueva suite de documentación en `docs/`
- [x] Task 8: Auditar la documentación técnica completa con subagente de verificación y verificar estado limpio de git

## Evidence & Verification
- Suite files: `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/architecture.md`, `docs/concurrency.md`, `docs/configuration.md`, `docs/kokoro-offline.md`.
- Zero broken links from `README.md`.
- Test suite: 140/140 passing (103 TypeScript unit tests + 37 landing tests).
- Verified Subagent Audit: PASS by `gentle-ai-verify` (task `mudbt3ja-6-9l2h`).

