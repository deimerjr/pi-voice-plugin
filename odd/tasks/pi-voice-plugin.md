# Feature: Pi Voice Plugin (TTS Universal para Pi CLI)

Plugin/Extensión para Pi CLI que sintetiza en voz las respuestas del asistente utilizando APIs de proveedores de IA (OpenAI, ElevenLabs, compatibles u endpoints genéricos HTTP), con control bajo demanda/automático, sanitización inteligente de código/markdown e interrupción inmediata de reproducción.

## Tasks

- [x] Task 1: Package structure & TypeScript setup (`package.json`, `tsconfig.json`, `.gitignore`) [commit: 2791270]
- [x] Task 2: Implement Config Manager (`src/config.ts`) con persistencia en disco y soporte de variables de entorno [commit: a8730c1]
- [x] Task 3: Implement Text Sanitizer (`src/sanitizer.ts`) para omitir código, tablas y formateo markdown en la locución [commit: c819f07]
- [x] Task 4: Implement Universal TTS Providers (`src/providers/`) con adaptadores para OpenAI/Compatible, ElevenLabs y Custom HTTP [commit: 0d60cd3]
- [x] Task 5: Implement Audio Player Manager (`src/player.ts`) con detección de reproductores nativos (pw-play, aplay, afplay) y cancelación inmediata [commit: 80ec32d]
- [x] Task 6: Implement Pi Extension entrypoint (`extensions/voice.ts` / `src/index.ts`) con comandos `/voice` y hooks de eventos (`agent_end`, `input`, etc.) [commit: 5ddef2f]
- [x] Task 7: Unit tests, verificación de funcionamiento y documentación en `README.md` [commit: 4081f14]
- [x] Task 8: Implement mouse-interactive widget, visual menu/submenus, voice preview, and custom API integration (`src/menu.ts`, `src/index.ts`) [commit: 69c4091]
- [x] Task 9: Deploy local Kokoro ONNX TTS server (`~/.kokoro-tts`, systemd service, `kokoro-tts` cli) and connect as native provider [commit: c4c744e]
- [x] Task 10: Implement one-click Stop button and Speaker volume control in Pi Voice Plugin [commit: f42b8ce]
- [x] Task 11: Implement Speech-to-Text (STT) voice input with native recorder, Whisper transcription, and Alt+R shortcut [commit: 20f7148]
- [x] Task 12: Fix Theme.bg crash on record button press and add customizable voice shortcuts in visual menu and CLI [commit: e55b3ea]
- [x] Task 13: Redesign menu UI (pure black background, monochrome icons, single unified API hub, wider dialog, and Whisper silence/hallucination filter) [commit: b6636df]
- [x] Task 14: Implement Audio TL;DR executive summary mode and expand menu width to eliminate overlapping text [commit: 2289602]
- [x] Task 15: Implement Multi-Agent Spanish Voice Personas with start/end task announcements and synthesis (`dora_heart`, `ef_dora`, `em_alex`, `em_santa`) [commit: 2b9fdd4]
- [x] Task 16: Ensure 100% Spanish translation for subagent start announcements and end summaries (`TldrSummarizer.quickTranslateCommonEnglish` and LLM translation) [commit: 7612b23]
- [x] Task 17: Implement conversational "Modo Cuadrilla" addressing user as Jefe with inter-agent baton passing and live dialogue [commit: 21bb92b]
- [x] Task 18: Implement live Orchestrator Phase Voice Announcer for direct task transitions and test executions (`/voice phases`, `cleanPhaseTitle`, `knownTodoTasks`)

