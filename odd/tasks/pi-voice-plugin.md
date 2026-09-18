# Feature: Pi Voice Plugin (TTS Universal para Pi CLI)

Plugin/Extensión para Pi CLI que sintetiza en voz las respuestas del asistente utilizando APIs de proveedores de IA (OpenAI, ElevenLabs, compatibles u endpoints genéricos HTTP), con control bajo demanda/automático, sanitización inteligente de código/markdown e interrupción inmediata de reproducción.

## Tasks

- [ ] Task 1: Package structure & TypeScript setup (`package.json`, `tsconfig.json`, `.gitignore`)
- [ ] Task 2: Implement Config Manager (`src/config.ts`) con persistencia en disco y soporte de variables de entorno
- [ ] Task 3: Implement Text Sanitizer (`src/sanitizer.ts`) para omitir código, tablas y formateo markdown en la locución
- [ ] Task 4: Implement Universal TTS Providers (`src/providers/`) con adaptadores para OpenAI/Compatible, ElevenLabs y Custom HTTP
- [ ] Task 5: Implement Audio Player Manager (`src/player.ts`) con detección de reproductores nativos (pw-play, aplay, afplay) y cancelación inmediata
- [ ] Task 6: Implement Pi Extension entrypoint (`extensions/voice.ts` / `src/index.ts`) con comandos `/voice` y hooks de eventos (`agent_end`, `input`, etc.)
- [ ] Task 7: Unit tests, verificación de funcionamiento y documentación en `README.md`
