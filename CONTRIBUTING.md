# Guía de Contribución y Desarrollo

Directrices de arquitectura, estándares de código, ejecución de pruebas y flujo de trabajo para contribuir a **Pi Voice Plugin**.

---

## Principios y Filosofía de Diseño

| Principio | Aplicación en el Proyecto |
| :--- | :--- |
| **Cognitive Doc Design** | Documentación escaneable: respuesta al inicio, tablas sobre prosa, chunking y navegación progresiva. |
| **Organic Driven Development (ODD)** | Desarrollo guiado por exploración proporcional, tareas rastreadas y commits por unidad de trabajo funcional. |
| **Zero Generic Emojis** | Prohibido el uso de emojis genéricos en la UI y la landing page. Usar iconos vectoriales monocromáticos (SVG) o etiquetas ASCII contextuales. |
| **100% Locución en Español** | Los agentes y el orquestador nunca deben hablar en inglés crudo. Todo texto técnico debe pasar por el pipeline de traducción y conjugación. |
| **100% Cobertura de Pruebas** | Todo cambio de comportamiento o adición de comandos debe incluir pruebas automatizadas en `src/**/*.test.ts` o `landing/landing.test.js`. |

---

## Requisitos Previos

- **Node.js**: Versión `>= 22.0.0` (soporte nativo para `--experimental-strip-types` y `node:test`).
- **Reproductor de audio en el sistema**:
  - Linux: `pw-play` (PipeWire), `aplay` (ALSA), `paplay` (PulseAudio) o `mpv`.
  - macOS: `afplay` (incluido por defecto).
  - Windows: `powershell`, `mpv` o `ffplay`.
- **Servidor Kokoro TTS Local (Opcional)**:
  - Necesario únicamente si se desea probar síntesis 100% offline sin consumir APIs externas.
  - Administrado vía `kokoro-tts start` en `http://127.0.0.1:8880`.

---

## Puesta en Marcha y Ejecución de Pruebas

El proyecto no utiliza compiladores intermedios pesados; ejecuta los módulos TypeScript directamente con Node.js.

### 1. Clonar e inspeccionar el repositorio
```bash
git clone https://github.com/CinloDev/pi-voice.git
cd pi-voice
```

### 2. Ejecutar la suite de pruebas del Plugin TypeScript (103 tests)
```bash
npm test
```

### 3. Ejecutar la suite de pruebas de la Landing Page (37 tests)
```bash
node --test landing/landing.test.js
```

### 4. Validar el empaquetado del plugin (tarball npm)
```bash
npm pack --dry-run
```

---

## Estándares de Programación

### Módulos y Tipado en TypeScript
1. **ES Modules nativos**: Utilizar sintaxis estándar de importación y exportación de ESM.
2. **Extensiones explícitas `.ts`**: Las importaciones relativas deben incluir la extensión `.ts` (ej: `import { TextSanitizer } from "./sanitizer.ts";`).
3. **Cero dependencias pesadas de runtime**: Priorizar APIs nativas de Node.js (`node:fs`, `node:path`, `node:os`, `node:child_process`, `node:crypto`).

### Interfaz de Usuario y Landing Page
1. **Iconografía monocromática**: En `landing/` y en las interfaces TUI, evitar emojis decorativos de colores (`🚀`, `🎉`, `🔥`). Emplear símbolos tipográficos ASCII, cajas neo-brutalistas o SVGs con `currentColor`.
2. **Estética Neo-Brutalista**: Respetar sombras duras desplazadas sin difuminado (`box-shadow: 4px 4px 0px #000`), bordes definidos de 2px a 4px y alto contraste.

### Event-Gating y Concurrencia de Audio
1. **Concurrencia limpia**: Cualquier acceso a dispositivos de audio o archivos temporales de reproducción debe canalizarse a través de `PlaybackLockManager` (`src/lock.ts`).
2. **Desparasitado de código**: Toda evaluación heurística de texto debe despojar previamente los bloques de código con `DecisionGate.stripCodeBlocks` para evitar falsos positivos.
3. **Cancelación inmediata**: Los procesos reproductores (`AudioPlayer`) deben responder a señales de parada y liberar cerrojos sincrónicamente en eventos `exit`, `SIGINT` y `SIGTERM`.

---

## Lista de Verificación para Pull Requests (PR Checklist)

Antes de abrir o solicitar revisión de un Pull Request, confirme los siguientes puntos:

- [ ] Las 103 pruebas unitarias del plugin pasan con éxito (`npm test`).
- [ ] Las 37 pruebas de la landing page pasan con éxito (`node --test landing/landing.test.js`).
- [ ] No se agregaron dependencias externas innecesarias en `package.json`.
- [ ] Todas las importaciones relativas en TypeScript incluyen la extensión `.ts`.
- [ ] El código no contiene emojis genéricos en la UI o en las interfaces de usuario.
- [ ] Todo mensaje oral generado para los agentes está traducido al español.
- [ ] `CHANGELOG.md` fue actualizado bajo el formato Keep a Changelog reflejando los cambios.
- [ ] `npm pack --dry-run` genera el paquete sin incluir archivos no deseados.
