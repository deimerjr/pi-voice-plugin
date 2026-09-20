# Feature: Título de Usuario Configurable en Modo Cuadrilla ("Jefe" personalizable)

Permitir que el apelativo con el que los agentes se dirigen al usuario (por defecto "Jefe") sea configurable interactivamente desde el menú visual (`/voice menu` ➔ `Voces de Agentes y Roles`), mediante comando CLI (`/voice title <apodo>` o `/voice jefe <apodo>`) y persistido en `voice.json`.

## Tasks

- [x] Task 1: Exploración y mapeo de ocurrencias de "Jefe" y definición de esquema (`gentle-ai-explore` / Dora)
  - Esquema definido en `SubagentVoicesConfig` con `userTitle?: string` (default: `"Jefe"`).
  - Mapeo de templates de locución en `src/index.ts` (subagentes, fases del orquestador, errores, verificación).
- [x] Task 2: Implementación en Config, Menú visual, CLI y plantillas de voz (`gentle-ai-worker` / Alex)
  - `src/config.ts`: agregado `userTitle?: string` a `SubagentVoicesConfig` y default `"Jefe"` en `DEFAULT_CONFIG.subagents`.
  - `src/tldr.ts`: soporte de `userTitle` en `TldrOptions`, heurística offline y system prompt de síntesis.
  - `src/index.ts`: definición de `getUserTitle()`, reemplazo de "Jefe" en todas las locuciones dinámicas, subcomandos `/voice title` y `/voice jefe <nombre>`.
  - `src/menu.ts`: pantalla `"user_title"` accesible desde `Voces de Agentes y Roles`, con presets ("Jefe", "Comandante", "Líder", "Sensei", "Capitán"), opción personalizada interactiva y retorno limpio.
- [x] Task 3: Auditoría y verificación técnica con suite de pruebas (`gentle-ai-verify` / Santa)
  - `src/index.test.ts`: prueba unitaria de `/voice title`, `/voice jefe` y persistencia en `voice.json`.
  - Ejecución de `npm test`: suite de 38 tests unitarios pasando exitosamente.
  - Documentación actualizada en `README.md`.
