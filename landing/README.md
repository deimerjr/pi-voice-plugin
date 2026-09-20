# Pi Voice Plugin — Landing Page Neo-Brutalista 🎙️⚡

Landing page estática oficial para **Pi Voice Plugin**, diseñada con una estética **Neo-Brutalista** (alto contraste, sombras duras desplazadas `5px 5px 0px #000`, bordes de 4px, paleta de colores vibrante `#FFE600`, `#00FF66`, `#00F0FF`, `#FF0055`, y tipografía monoespaciada).

---

## 🎨 Características de Diseño & Interacción

1. **Cinta de Marquesina Brutalista**: Ticker superior con animación continua infinita que se pausa al pasar el cursor.
2. **Hero de Alto Impacto**: Encabezados gigantes, badge de estado en tiempo real, arte ASCII del motor de voz y snippet de instalación con botón de copiado de un solo clic.
3. **Soundboard Interactivo de la Cuadrilla**:
   - Tarjetas individuales para **El Gentleman**, **Dora**, **Alex** y **Santa** con citas en español y timbres de voz diferenciados.
   - Sintetizador de audio dual: utiliza **Web Speech API** nativa en español para locución real y **Web Audio API** con osciladores para tonos retro de apertura de canal.
   - Botón *"Reproducir diálogo completo de la cuadrilla"* que ejecuta la cadena de los 4 agentes en secuencia.
4. **Simulador TUI de Pi CLI**:
   - Ventana interactiva que emula la interfaz de terminal de Pi CLI.
   - Widget interactivo al pie con botones funcionales: alternancia de estado `Voice: ON/OFF`, botón `⏹️ Parar`, ajuste cíclico de volumen `🔊` y simulación de dictado Whisper STT `🎙️ Dictar`.
5. **Esquema de Arquitectura ASCII**: Diagrama de flujo del pipeline de audio (Sanitizer ➔ TL;DR ➔ Chunking ➔ Provider ➔ Player).
6. **Cheat Sheet de Comandos y Atajos**: Tablas estilizadas con los atajos globales (`Alt + R`, `Alt + S`, `Alt + V`, `Alt + Up`, `Alt + Down`) y comandos `/voice`.

---

## 🚀 Cómo Visualizar la Landing Page

La landing page es 100% estática, autocontenida y no requiere `npm install` ni librerías externas.

### Opción 1: Abrir directamente en el navegador
Podés abrir el archivo directamente con tu navegador favorito:
```bash
google-chrome landing/index.html
# o
firefox landing/index.html
# o
xdg-open landing/index.html
```

### Opción 2: Servir con un servidor local ligero (Acceso desde Windows / LAN)
Con Python (escuchando en toda la red local):
```bash
python3 -m http.server 3000 --bind 0.0.0.0 --directory landing
```
O con `npx serve`:
```bash
npx serve landing -l 3000
```

#### 🌐 Acceso desde Windows u otro equipo en la red local:
Abrí tu navegador en Windows (Chrome, Edge, Firefox) e ingresá a:
👉 **`http://192.168.18.29:3000`**

---

## 🧪 Pruebas Automatizadas

La integridad de la landing page (HTML semántico, selectores, tokens CSS brutalistas y funciones JS) se valida mediante la suite automatizada con `node:test`:

```bash
node --test landing/landing.test.js
```
*(15 pruebas unitarias cubriendo estructura HTML5, CSS tokens, media queries y lógica de app.js).*
