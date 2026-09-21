# Pi Voice Plugin (TTS Universal para Pi CLI) 🎙️

Plugin / Extensión modular para **Pi CLI** que sintetiza en voz las respuestas del asistente utilizando las APIs de cualquier proveedor de inteligencia artificial (OpenAI, ElevenLabs, Groq, Kokoro, Deepgram, LocalAI o endpoints HTTP custom).

---

## 🌟 Características

- **Menú Visual Interactivo con Mouse**:
  - Un botón widget interactivo colocado al pie del editor `[ 🎙️ Voice: ON/OFF (voz) • Clic: Menú ⚙️ ]` que podés clickear directamente con el ratón.
  - Interfaz visual por overlays con navegación por mouse y teclado (flechas, Enter, Escape).
  - Atajo rápido global `ctrl+alt+v` o comando `/voice menu` / `/voice`.
- **Modo Cuadrilla ("Jefe" o Apelativo Personalizado) e Interacción Dinámica de Equipo**:
  - Los subagentes se coordinan en vivo, se dirigen a vos por tu apelativo preferido (por defecto **"Jefe"**, configurable a **"Comandante"**, **"Líder"**, **"Sensei"**, **"Capitán"** o cualquier nombre personalizado) y se pasan la posta entre ellos con roles definidos:
    - **Dora (Exploradora / Scout)**: *"<Apelativo>, me pongo a explorar el terreno..."* y al terminar: *"Alex, te dejo la cancha lista."*
    - **Alex (Programador / Worker)**: *"Recibido Dora, tomo la posta. <Apelativo>, arranco con la implementación..."* y al terminar: *"Santa, pasale la lupa y fijate si no rompí nada."*
    - **Santa (Auditor / Reviewer)**: *"A ver qué hiciste, Alex... <Apelativo>, voy a auditar con lupa..."* y al terminar: *"Gentleman, todo verificado y aprobado para <Apelativo>."*
  - Podés cambiar tu apelativo en cualquier momento desde el menú visual (`/voice menu` ➔ `Voces de Agentes y Roles` ➔ `Apelativo / Título`) o por consola con `/voice title <apodo>` o `/voice jefe <apodo>`.
- **Voces Diferenciadas por Subagente / Rol (Español Nativo)**:
  - Cada agente del harness tiene su propio timbre de voz asignado en español:
    - **Orquestador (`el Gentleman`)**: `dora_heart` (cálida y equilibrada).
    - **Explorador (`gentle-ai-explore` / Scout)**: `ef_dora` (femenina ágil y descriptiva).
    - **Programador (`gentle-ai-worker` / Worker)**: `em_alex` (masculina técnica y directa).
    - **Auditor (`gentle-ai-verify` / Reviewer)**: `em_santa` (grave, pausada y autoritaria).
  - Anuncia oralmente cuándo inicia cada subagente y sintetiza un resumen ejecutivo TL;DR de lo logrado al finalizar su tarea.
- **Locución de Fases del Orquestador y Control de Pruebas**:
  - Cuando el orquestador trabaja de forma directa (sin delegar subagentes o en desarrollo ODD), transmite oralmente cada fase en tiempo real:
    - Anuncia la planificación inicial de fases (herramienta `todo`).
    - Anuncia el inicio de cada fase (*"Jefe, arranco la fase: [nombre]..."*).
    - Anuncia el cierre de cada fase (*"Jefe, quedó lista la fase: [nombre]..."*).
  - Se controla con `/voice phases [on|off]` o desde el menú visual interactivo.
- **Anuncio Inteligente de Pruebas de Verificación**:
  - Locución oral al correr suites de verificación (`npm test`, `node --test`, `pytest`, `cargo test`, `go test`, etc.) en consola sin subagentes (*"Jefe, voy a correr las pruebas..."* y confirmación de resultado).
  - **Interruptor independiente**: Activá o desactivá solo el anuncio de tests mediante `/voice tests [on|off]` (o `/voice pruebas [on|off]`) y desde el menú visual (`/voice menu` ➔ `Voces de Agentes y Roles`).
  - **Filtro inteligente y supresión de subagentes**: Si un subagente (como Santa / Auditor) está activo auditando, el orquestador suprime automáticamente sus avisos para no duplicar ni hablar encima de las locuciones del agente.
  - **Enfriamiento inteligente (debounce de 30s)**: Evita locuciones repetitivas al relanzar pruebas consecutivas rápidamente.
- **Concurrencia Multi-Sesión y Coordinación Inter-Proceso**:
  - Permite tener múltiples terminales de Pi CLI abiertas en paralelo sin que se pisen los audios:
    - **Opción 1: Cola FIFO (`queue` - Por Defecto / Recomendado)**: Espera ordenada con cerrojo atómico inter-proceso y tickets lexicográficos. Las sesiones esperan su turno y hablan una tras otra sin mezclarse.
    - **Opción 2: Interrupción Previa (`interrupt` - Takeover)**: La sesión más reciente corta el audio en curso de la sesión previa y toma el control de inmediato.
    - **Opción 3: Modo Foco (`focus`)**: Solo habla la terminal en la que estás trabajando activamente (donde escribiste o abriste el menú); las demás sesiones de fondo permanecen en silencio.
    - **Desactivada (`off`)**: Sin coordinación inter-proceso.
- **Anuncio de Nombre de Proyecto / Contexto (`announceProject`)**:
  - Antepone `"En <proyecto>:"` (ej: *"En Voz: Alex arranca con la tarea..."*) para identificar al instante qué repositorio o terminal está hablando cuando tenés varias ventanas abiertas.
- **Modo Audio TL;DR vs Lectura Completa**:
  - Alterná entre síntesis ejecutiva breve (`/voice tldr`) y lectura completa palabra por palabra, con feedback transparente y explicativo en el menú visual.
- **Entrada Directa de Voz (Dictado de Prompts / STT)**:
  - Presionás **`Alt + R`** (o hacés clic en `[ 🎙️ Dictar ]` o `/voice record`), hablás al micrófono y al volver a presionar la tecla, transcribe automáticamente con Whisper e inserta el texto directo en tu prompt de Pi CLI.
- **Botón de Parada con un Clic e Indicador de Volumen**:
  - Un botón de parada dedicado `[ ⏹️ Parar ]` que se ilumina en rojo `[ ⏹️ Detener ]` durante la reproducción y detiene el audio al instante con un solo clic.
  - Un botón de volumen `[ 🔊 100% ]` con icono de parlante dinámico que al hacerle clic abre el diálogo interactivo para subir, bajar o silenciar el volumen (de 0% a 150%).
- **Preescucha de Voces en Vivo (Audio Preview)**:
  - Al explorar el catálogo de voces de OpenAI o ElevenLabs, podés escuchar una muestra de audio real de cada voz antes de confirmarla.
- **Integración de API Custom**:
  - Conexión con cualquier endpoint HTTP REST propio o servidor local (Kokoro, XTTS, vLLM, Piper), con configuración interactiva de URL, método (POST/GET), headers de autorización y formato (WAV/MP3).
- **Soporte Universal de Proveedores**:
  - **Kokoro TTS Local (100% Offline y Gratis)**: Servidor local ONNX corriendo en tu propio Ubuntu (`http://127.0.0.1:8880`), sin límites, sin costo de API y con voces en español natural (`ef_dora`, `em_alex`, `em_santa`).
  - **OpenAI / Compatible** (`/v1/audio/speech`): Compatible de forma nativa con OpenAI (`tts-1`, `tts-1-hd`), Groq, Deepgram, LocalAI, vLLM y FastWhisper.
  - **ElevenLabs** (`/v1/text-to-speech`): Voces ultrarrealistas y clonadas con modelos multilingües.
  - **Custom HTTP**: Adaptador genérico para conectar cualquier backend REST propio o local.
- **Sanitización Inteligente de Texto**:
  - Filtra automáticamente bloques de código (```ts ... ```), tablas ASCII, enlaces y sintaxis markdown para que la voz lea únicamente la explicación fluida y natural en prosa.
- **Reproducción sin Bloqueo e Interrupción Inmediata**:
  - Detección automática del reproductor del sistema (`pw-play` PipeWire, `aplay` ALSA, `afplay` macOS, o reproductores personalizados).
  - Si empezás a escribir o enviás un nuevo prompt en Pi, el plugin corta la locución de inmediato.
- **Modo Bajo Demanda o Automático**:
  - Por defecto permanece en modo manual/bajo demanda (`/voice read`) para no molestar. Podés activar la lectura automática con `/voice on` cuando quieras manos libres.
- **Persistencia de Configuración**:
  - Guarda tus preferencias en `~/.pi/agent/voice.json` y respeta variables de entorno estándar (`OPENAI_API_KEY`, `ELEVENLABS_API_KEY`).

---

## 🚀 Instalación

Podés usar el plugin directamente o instalarlo de forma permanente en Pi:

### Opción 1: Probar sin instalar (sesión actual)
```bash
pi -e /home/hermes/Desarrollos/Automatizacion/Gentle/Plugin/Voz
```

### Opción 2: Instalar en Pi de forma global
```bash
pi install /home/hermes/Desarrollos/Automatizacion/Gentle/Plugin/Voz
```

---

## 💬 Comandos Disponibles

Dentro de Pi CLI tenés disponible el comando `/voice`:

| Comando | Descripción |
| :--- | :--- |
| `/voice` / `/voice menu` | Abre el menú visual interactivo con soporte de mouse |
| `/voice record` / `/voice dictar` | Inicia o finaliza la grabación de voz para dictar prompts (`Alt + R`) |
| `/voice crew [on\|off]` | Alterna el modo interactivo de cuadrilla |
| `/voice title <nombre>` / `/voice apelativo <nombre>` | Configura el apelativo con el que te llaman los agentes (ej: `Comandante`, `Sensei`) |
| `/voice jefe <nombre>` | Atajo directo para configurar el apelativo del usuario |
| `/voice agents [on\|off]` | Alterna las voces diferenciadas y avisos para subagentes |
| `/voice phases [on\|off]` | Alterna la locución de fases del orquestador en ejecuciones directas |
| `/voice tests [on\|off]` / `/voice pruebas [on\|off]` | Alterna el anuncio oral de pruebas de verificación directas |
| `/voice tldr` / `/voice resumen` | Alterna el modo de resumen ejecutivo breve (TL;DR) |
| `/voice on` | Activa la lectura automática tras cada respuesta |
| `/voice off` | Desactiva la lectura automática (modo silencioso) |
| `/voice toggle` | Alterna entre lectura automática ON / OFF |
| `/voice read` | Lee en voz alta la última respuesta generada por el asistente |
| `/voice stop` | Detiene inmediatamente la reproducción en curso |
| `/voice test [frase]` | Prueba el sintetizador y el reproductor de audio |
| `/voice status` | Muestra proveedor, voz, velocidad, reproductor y estado actual |
| `/voice provider <tipo>` | Cambia de proveedor (`kokoro`, `openai`, `elevenlabs`, `custom`) |
| `/voice voice <nombre>` | Cambia la voz (ej: `nova`, `alloy`, `echo`, `onyx`, o ID de ElevenLabs) |
| `/voice custom <accion>` | Configura API custom (`url`, `method`, `format`, `activate`) |
| `/voice concurrency [queue\|interrupt\|focus\|off]` | Configura coordinación entre sesiones simultáneas (cola FIFO, interrupción, foco o off) |
| `/voice project [on\|off]` / `/voice proyecto [on\|off]` | Antepone el nombre del proyecto actual al hablar (`En <proyecto>:`) |
| `/voice volume <0-150>` | Ajusta el volumen de reproducción (ej: `80`, `100`, `150`) |
| `/voice speed <numero>` | Ajusta la velocidad de habla (ej: `1.0`, `1.25`) |
| `/voice filter <modo>` | Tratamiento de código: `omit` (ignorar), `mention` (avisar), `raw` (leer todo) |
| `/voice key <api-key>` | Guarda la clave de API para el proveedor activo en `voice.json` |
| `/voice help` | Muestra la ayuda rápida en pantalla |

---

## ⌨️ Atajos de Teclado (Disponibles en cualquier modo)

| Atajo | Acción |
| :--- | :--- |
| `Alt + R` | Inicia o detiene la grabación del micrófono para dictar el prompt 🎙️ |
| `Alt + S` | Detiene inmediatamente la reproducción de voz o cancela la grabación ⏹️ |
| `Alt + V` | Abre el menú visual interactivo de Pi Voice ⚙️ |
| `Alt + Up` | Sube el volumen de voz (+10%) 🔊 |
| `Alt + Down` | Baja el volumen de voz (-10%) 🔉 |

---

## 🖥️ Servidor Kokoro TTS Local en Ubuntu

El servidor local de Kokoro TTS corre de forma continua en tu sistema administrado por `systemd`:
- **Endpoint OpenAI compatible:** `http://127.0.0.1:8880/v1/audio/speech`
- **Comando de administración:**
  ```bash
  kokoro-tts status   # Ver estado y prueba de conectividad
  kokoro-tts restart  # Reiniciar el servidor
  kokoro-tts stop     # Detener el servidor
  kokoro-tts start    # Iniciar el servidor
  kokoro-tts test     # Sintetizar y reproducir un audio de prueba
  ```

---

## ⚙️ Configuración y Variables de Entorno

El plugin resuelve las claves de API en el siguiente orden:
1. En el archivo `~/.pi/agent/voice.json` (configurado mediante `/voice key ...`).
2. En las variables de entorno de tu terminal:
   - `OPENAI_API_KEY` o `OPENAI_TTS_API_KEY` (para OpenAI / compatibles)
   - `ELEVENLABS_API_KEY` o `XI_API_KEY` (para ElevenLabs)

### Ejemplo de `~/.pi/agent/voice.json`:

```json
{
  "enabled": true,
  "autoRead": false,
  "mode": "final",
  "filterCode": "omit",
  "provider": "openai",
  "maxCharsPerSpeech": 4000,
  "openai": {
    "baseUrl": "https://api.openai.com/v1",
    "model": "tts-1",
    "voice": "nova",
    "speed": 1.0,
    "format": "wav"
  },
  "elevenlabs": {
    "baseUrl": "https://api.elevenlabs.io/v1",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "modelId": "eleven_multilingual_v2",
    "stability": 0.5,
    "similarityBoost": 0.75
  },
  "custom": {
    "url": "http://localhost:8000/v1/audio/speech",
    "method": "POST",
    "format": "wav",
    "headers": {
      "Content-Type": "application/json"
    }
  },
  "subagents": {
    "enabled": true,
    "crewMode": true,
    "announceStart": true,
    "announceEnd": true,
    "announceOrchestratorPhases": true,
    "announceTests": true,
    "orchestrator": "dora_heart",
    "scout": "ef_dora",
    "worker": "em_alex",
    "reviewer": "em_santa",
    "userTitle": "Jefe"
  }
}
```

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una suite completa de pruebas unitarias ejecutadas directamente sobre el motor nativo de Node.js:

```bash
npm test
```

Ejecuta las pruebas de:
- `ConfigManager` (carga, persistencia, resolución de claves y fallbacks de entorno).
- `TextSanitizer` (filtrado de markdown, bloques de código, tablas y tags `<think>`).
- `TTS Providers` (formateo de payloads y endpoints para OpenAI, ElevenLabs y Custom HTTP).
- `AudioPlayer` (detección de binarios CLI y señales de parada).
- `Extension Entrypoint` (registro de comandos `/voice` y manejadores de ciclo de vida).

---

## 📄 Licencia

MIT
