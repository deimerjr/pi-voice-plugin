# Feature: Control y Filtro de Anuncio de Pruebas de Verificación

Hacer que la locución oral de ejecución de pruebas ("voy a correr las pruebas de verificación") tenga su propio interruptor independiente en el menú visual (`/voice menu` ➔ `Voces de Agentes y Roles`), con comando CLI (`/voice tests [on|off]`), persistencia en `voice.json`, filtro inteligente (no hablar si un subagente como Santa ya está auditando) y enfriamiento (debounce de 30s) para evitar repeticiones múltiples.

## Tasks

- [x] Task 1: Exploración y diseño de la opción de configuración, debounce y filtro (`gentle-ai-explore` / Dora)
- [x] Task 2: Implementación de `announceTests`, debounce de 30s, menú visual y comando CLI (`gentle-ai-worker` / Alex)
- [ ] Task 3: Verificación técnica y suite de pruebas unitarias (`gentle-ai-verify` / Santa)
