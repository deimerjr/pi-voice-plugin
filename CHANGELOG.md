# Changelog

Todos los cambios notables en este proyecto se documentan en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.1.0] - 2026-09-22

### Added
- **Modo Solo Decisiones y Permisos (`decisionsOnly`)**:
  - Compuertas de eventos en `src/decision-gate.ts` para silenciar el parloteo rutinario de subagentes autónomos, transiciones de fases y suites de pruebas directas.
  - Detección sintáctica de preguntas de opción múltiple, disyunciones binarias y solicitudes explícitas de confirmación/autorización en español e inglés.
  - Detección y locución prioritaria de herramientas interactivas de decisión (`question`, `ask_user_choice`, `ask_user_question`, `ask_user_confirmation`).
  - Desparasitado de bloques de código markdown (cercados e inline) para prevenir falsos positivos en comentarios o firmas de funciones.
  - Auto-acoplamiento inteligente: la activación de `decisionsOnly` habilita automáticamente `autoRead` si la lectura estaba inactiva.
  - Comandos CLI `/voice decisions [on|off]` (alias: `/voice decisiones`, `/voice permisos`, `/voice solo-decisiones`) y toggle directo en menú TUI.
- **Traducción Integral al Español para Subagentes**:
  - Traductor síncrono instantáneo `translateTaskLabel` (<1 ms) para etiquetas de tareas e instrucciones de inicio de subagentes y fases del orquestador.
  - Extractor semántico de desenlaces técnicos `extractSubagentOutcome` sobre bloques YAML (`summary:`, `outcome:`) y secciones Markdown (`## Summary`, `## Outcome`).
  - Traductor y conjugador en primera persona según el rol `translateEnglishSentence` ("Implementé...", "Exploré...", "Verifiqué...").
  - Barrera de seguridad determinista que garantiza cero frases crudas en inglés transmitidas por los altavoces.
- **Formulario Neo-Brutalista de Contacto y Registro en Landing Page**:
  - Nueva sección semántica `#contacto` en `landing/index.html` con estética neo-brutalista, borde grueso de 4px y sombras duras.
  - Encabezado terminal retro `FORMULARIO_INSCRIPCION_V1.EXE` con selector de roles por radiogroup (Scout, Worker, Reviewer, Orchestrator).
  - Botón interactivo de preescucha con arpegios tonales mediante Web Audio API y banner de retroalimentación accesible (`aria-live`).
  - Persistencia de registros en `localStorage` sin trackers ni dependencias externas.
- **140 Tests Automatizados**:
  - 103 pruebas unitarias e integración para el plugin TypeScript (`src/**/*.test.ts`).
  - 37 pruebas para la landing page neo-brutalista (`landing/landing.test.js`).
  - Ejecución nativa al 100% sobre Node.js sin herramientas externas de testing.

---

## [1.0.0] - 2026-09-20

### Added
- **Coordinador de Concurrencia Multi-Sesión (`PlaybackLockManager`, `InterProcessLock`)**:
  - Control atómico de reproducción de audio entre múltiples terminales de Pi CLI mediante cerrojos POSIX en `/tmp/pi-voice-<uid>/`.
  - 4 modos configurables:
    - `queue` (por defecto): Cola ordenada FIFO con ordenamiento lexicográfico de marcas de tiempo y purga de PIDs obsoletos.
    - `interrupt`: Preempción inmediata del cerrojo activo enviando `SIGKILL` al proceso reproductor en ejecución.
    - `focus`: Seguimiento de la sesión en foco activo (`active_session.json`), silenciando terminales secundarias en segundo plano.
    - `off`: Bypass directo sin cerrojo ni sincronización.
- **Prefijo Contextual de Proyecto (`announceProject`)**:
  - Antepone `"En <proyecto>: ..."` en las locuciones para identificar qué repositorio o terminal está emitiendo audio.
- **Modo Cuadrilla con Traspaso Dinámico de Posta**:
  - Personas dinámicas para la cuadrilla de subagentes: Dora (Scout), Alex (Worker), Santa (Reviewer) y el Gentleman (Orchestrator).
  - Título/apelativo de usuario personalizable ("Jefe", "Comandante", "Líder", "Sensei", etc.) vía `/voice title <apodo>` o `/voice jefe <apodo>`.
  - Diálogos encadenados de saludo, entrega y recepción de tareas entre agentes.
- **Nombres de Subagentes Configurables**:
  - Parámetros `scoutName`, `workerName`, `reviewerName` y `orchestratorName` editables vía CLI (`/voice name <rol> <nombre>`) y menú TUI.
- **Motor de Resumen TL;DR con 3 Niveles de Detalle**:
  - Modo síntesis ejecutiva configurable en tres granularidades:
    - `high`: Síntesis ultra-breve de 1 frase (~25 palabras).
    - `medium`: Resumen balanceado de 2 a 3 oraciones.
    - `low`: Alta fidelidad (80-90% del contenido original) omitiendo código y tablas.
- **Integración con Servidor Kokoro TTS Local (100% Offline, Cero Tokens)**:
  - Soporte nativo para Kokoro TTS sobre ONNX Runtime vía endpoint local `http://127.0.0.1:8880/v1`.
  - Catálogo de 54 voces estándar y soporte de voces clonadas e híbridas (`valeria`, `juan_carlos`, `fenrir_es`, `ximena`, `mateo`, `adrian`).
  - Operación gratuita, sin consumo de tokens de API y sin conexión a internet.
- **Menú Visual Interactivo a Pantalla Completa (`Alt + V`)**:
  - Navegación híbrida por teclado y mouse con selector tipo radio, preescuchas de voz en tiempo real y submenús contextuales.
  - Componente de barra de control en la línea de estado con botones para parar, dictar y regular volumen.
  - Hoja de atajos y controles integrada ("Cheat Sheet") accesible desde cualquier pantalla.
- **Landing Page Neo-Brutalista en `landing/`**:
  - Terminal Theater interactivo animado con la paleta de colores del tema `Gentleman-Sexy-Djr` de Pi CLI.
  - Soundboard interactivo de la cuadrilla, analizador de espectro reactivo en canvas y catálogo de voces.
