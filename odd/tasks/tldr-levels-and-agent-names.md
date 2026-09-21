# Feature: Niveles de Resumen TL;DR (Alto, Medio, Bajo) y Nombres de Agentes Configurables

Brindar control granular sobre:
1. **Niveles de Detalle TL;DR**:
   - `high` (Alto): Síntesis ejecutiva máxima (1 sola frase contundente, ultra-breve).
   - `medium` (Medio - default): Resumen balanceado de 2-3 oraciones con resultado y contexto esencial.
   - `low` (Bajo): Casi la respuesta original (80-90% de detalle, omitiendo solo código crudo o elementos no verbalizables).
   - Selector en el menú visual y comando `/voice tldr level [alto|medio|bajo]`.
2. **Nombres de Agentes Personalizables**:
   - Configuración de nombres para los 4 roles: `scoutName` (Dora), `workerName` (Alex), `reviewerName` (Santa), `orchestratorName` (el Gentleman).
   - Selección visual en el menú con presets y texto libre.
   - Integración dinámica en las locuciones conversacionales de traspaso de posta.
   - Comandos CLI `/voice name <scout|worker|reviewer|orchestrator> <nombre>`.

## Tasks

- [x] Task 1: Exploración y diseño de los prompts/heurísticas de niveles TL;DR y esquema de nombres (`gentle-ai-explore` / Dora)
- [x] Task 2: Implementación en `src/config.ts`, `src/tldr.ts`, `src/index.ts`, `src/menu.ts` y tests (`gentle-ai-worker` / Alex)
- [x] Task 3: Verificación técnica integral y suite de pruebas (`gentle-ai-verify` / Santa) [commit: 6391008]
