# Feature: Opciones Completas de Concurrencia Multi-Sesión (Cola FIFO, Interrupción, Modo Foco y Prefijo de Proyecto)

Brindar control integral sobre cómo interactúan múltiples sesiones de Pi abiertas simultáneamente:
1. **Modo Concurrencia (Inter-Proceso)**:
   - `queue` (Opción 1 - POR DEFECTO): Cola ordenada FIFO con cerrojo atómico. Las terminales esperan su turno y hablan una tras otra sin pisarse.
   - `interrupt` (Opción 2): Interrupción inmediata. La sesión más reciente corta el audio de la anterior y toma el control.
   - `focus` (Opción 2.B): Modo Foco. Solo habla la terminal donde el usuario interactuó más recientemente; las sesiones de fondo permanecen en silencio.
   - `off`: Desactivado (sin bloqueo inter-proceso).
2. **Contexto de Proyecto / Sesión (Opción 3)**:
   - `announceProject?: boolean` (default `false`): Si está activo, antepone el nombre del proyecto/directorio actual (ej: "En Voz: ...") para saber qué terminal está hablando cuando hay varias abiertas.
3. **Modo de Lectura (TL;DR vs Completo)**:
   - Menú con feedback transparente: "Lectura completa (sin resumir)" vs "Resumen ejecutivo breve (TL;DR)".

## Tasks

- [x] Task 1: Exploración y diseño técnico de Modo Foco y Prefijo de Proyecto (`gentle-ai-explore` / Dora)
- [x] Task 2: Implementación en `src/lock.ts`, `src/config.ts`, `src/index.ts`, `src/menu.ts` y tests (`gentle-ai-worker` / Alex)
- [ ] Task 3: Verificación técnica integral y suite de pruebas (`gentle-ai-verify` / Santa)
