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
