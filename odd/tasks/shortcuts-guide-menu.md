# Feature: Lista y Guía Completa de Atajos y Controles en el Menú Visual (Cheat Sheet)

Agregar al menú visual de Pi Voice una pantalla dedicada de guía y lista de atajos ("shortcuts_guide") que detalle todos los atajos y controles para dominar la aplicación:
1. **Atajos Globales de Teclado**: Dictado por voz (Alt+R), Parar audio (Alt+S), Menú visual (Alt+V), Subir/Bajar volumen (Alt+Up/Down).
2. **Navegación del Menú TUI**: Flechas (↑/↓), Enter, Escape (volver/cerrar), números para salto directo.
3. **Controles de Mouse**: Widget interactivo al pie del editor (clic en Voice, Parar, Volumen, Dictar).
4. **Comandos de Consola (`/voice`)**: Lectura completa (/voice read), niveles TL;DR (/voice tldr), Cuadrilla (/voice crew), Título (/voice title), Nombres de agentes (/voice name), Concurrencia (/voice concurrency), Proyecto (/voice project), Tests (/voice tests).
5. **Navegación fluida y reasignación de teclas**: Acceso directo desde el menú principal y desde la pantalla de atajos, con soporte de Escape y retrocompatibilidad.

## Tasks

- [x] Task 1: Exploración y diseño de la pantalla de guía de atajos en `src/menu.ts` (`gentle-ai-explore` / Dora)
- [x] Task 2: Implementación de `shortcuts_guide`, integración en el menú y tests unitarios (`gentle-ai-worker` / Alex)
- [ ] Task 3: Verificación técnica con suite de pruebas completa (`gentle-ai-verify` / Santa)
