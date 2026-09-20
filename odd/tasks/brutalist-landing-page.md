# Feature: Brutalist Landing Page para Pi Voice Plugin

Landing page estática con estética Neo-Brutalista (bordes gruesos de 4px, sombras duras desplazadas `5px 5px 0px #000`, paleta de alto contraste con amarillo neón, verde tóxico y cian, tipografía monoespaciada y stickers técnicos) para presentar y promocionar el Pi Voice Plugin, sus características (Modo Cuadrilla, Kokoro TTS local offline, Whisper STT, Audio TL;DR y widget TUI) e interacción en vivo.

## Metadata
- **Status:** In Progress
- **Directory:** `landing/`
- **Delivery Strategy:** `single-pr`
- **TDD Mode:** `functional-checks` (suite automatizada con `node:test` en `landing/landing.test.js`)
- **Estimated Changed Lines:** ~700 lines

---

## Tasks

- [ ] Task 1: HTML Architecture & Semantic Structure (`landing/index.html`)
  - Hero brutalista con ASCII art, badges de estado y snippet de instalación con 1-click copy.
  - Sección interactiva de "Modo Cuadrilla" con los 4 perfiles (Gentleman, Dora, Alex, Santa).
  - Grilla de características con tarjetas de bordes duros y sombras rígidas.
  - Tabla de atajos de teclado y comandos `/voice`.
  - Diagrama de arquitectura del pipeline en ASCII.
  - Footer neo-brutalista con licencia MIT y enlaces.
  - *Checks:* `landing/index.html` parseable, etiquetas semánticas y meta tags presentes.

- [ ] Task 2: Neo-Brutalist Design System & Responsive Styles (`landing/styles.css`)
  - Paleta neo-brutalista: `#FFE600` (Electric Yellow), `#00FF66` (Toxic Green), `#00F0FF` (Cyan), `#FF0055` (Pink), `#0A0A0A` (Black), `#FFFFFF`.
  - Bordes duros de 3px a 4px, sombras offset `5px 5px 0px #000`, botones con efecto de pulsación mecánica (`translate(2px, 2px)`).
  - Badges rotados tipo sticker, cinta de marquesina continua, bloques de código retro-terminal.
  - Diseño 100% responsivo para móviles y escritorio.
  - *Checks:* Variables CSS definidas, reglas responsivas y animación de marquesina funcionales.

- [ ] Task 3: Interactive Features & Cuadrilla Voice Simulator (`landing/app.js`)
  - Botón de copia al portapapeles con feedback visual brutalista ("COPIADO! ✓").
  - Soundboard interactivo de la Cuadrilla con Web Speech API en español nativo (o sintetizador de audio retro Web Audio API) para escuchar a Dora, Alex, Santa y Gentleman en el navegador.
  - Simulador TUI interactivo del widget de Pi CLI con alternancia de estados ON/OFF y volumen.
  - Ticker marquee con pausa al pasar el cursor.
  - *Checks:* Event listeners vinculados, soporte de Web Speech API / Web Audio API y compatibilidad sin dependencias externas.

- [ ] Task 4: Automated Verification & Documentation (`landing/landing.test.js`, `landing/README.md`)
  - Suite de pruebas unitarias en `landing/landing.test.js` con `node:test` validando la integridad del HTML, selectores CSS, tokens brutalistas y funciones de `app.js`.
  - `landing/README.md` con instrucciones para previsualizar localmente (`npx serve landing` o apertura directa de `index.html`).
  - *Checks:* `node --test landing/landing.test.js` ejecutado y pasando al 100%.
