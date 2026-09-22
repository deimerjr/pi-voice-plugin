# Feature: Modo Solo Decisiones y Permisos ("Decisions & Permissions Only")

Permitir que Pi Voice opere en modo silencioso durante ejecuciones autónomas de subagentes y tareas rutinarias, activando la síntesis de voz exclusivamente cuando el agente presenta una decisión con opciones para elegir o requiere autorización/permiso explícito del usuario.

## Tasks
- [x] Task 1: Agregar `decisionsOnly?: boolean` en `src/config.ts` y pruebas unitarias en `src/config.test.ts`
- [x] Task 2: Implementar el motor de detección `src/decision-gate.ts` con heurísticas de opciones, preguntas de elección y permisos, y pruebas completas en `src/decision-gate.test.ts`
- [x] Task 3: Integrar compuertas de eventos en `src/index.ts` para silenciar subagentes/fases/tests automáticos y hablar ante decisiones/permisos, agregando comandos CLI `/voice decisions`
- [x] Task 4: Agregar interruptor interactivo en el menú visual `src/menu.ts` con sincronización automática de `autoRead` y pruebas en `src/menu.test.ts`
- [x] Task 5: Ejecutar suite completa de pruebas TypeScript y auditar con subagente de verificación

## Evidence & Work-Unit Commits
- Commit: `feat(voice): add decisions and permissions only speech mode`
- Test Verification:
  - `npm test`: 96/96 passing across 15 suites (0 failures).
  - `node --test landing/landing.test.js`: 37/37 passing across 7 suites (0 failures).
  - Total: 133/133 tests passing at 100%.
- Verified Subagent Audit: PASS by `gentle-ai-verify` (task `muc78dtf-6-fxdw`).
