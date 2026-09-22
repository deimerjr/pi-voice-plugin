# Pi Voice Plugin (TTS Universal para Pi CLI) 🎙️

Plugin / Extensión modular para **Pi CLI** que sintetiza en voz las respuestas del asistente utilizando las APIs de cualquier proveedor de inteligencia artificial (OpenAI, ElevenLabs, Groq, Kokoro, Deepgram, LocalAI o endpoints HTTP custom).

---

## 🌟 Características

- **Menú Visual Interactivo con Mouse**:
  - Un botón widget interactivo colocado al pie del editor `[ 🎙️ Voice: ON/OFF (voz) • Clic: Menú ⚙️ ]` que podés clickear directamente con el ratón.
  - Interfaz visual por overlays con navegación por mouse y teclado (flechas, Enter, Escape).
  - Atajo rápido global `ctrl+alt+v` o comando `/voice menu` / `/voice`.
- **Modo Solo Decisiones y Permisos (`decisionsOnly`)**:
  - Filtro inteligente de excepciones: Pi silencia el parloteo de fondo, las ejecuciones autónomas de subagentes, las fases de desarrollo y los resúmenes puramente informativos.
  - **Voz activa únicamente ante la necesidad de acción humana**:
    - **Opciones a elegir**: Preguntas con alternativas múltiples (`1. ... 2. ...` o `A) ... B) ...`) o disyunciones binarias (*"¿Preferís X o Y?"*).
    - **Solicitud de permisos o autorizaciones**: Cuando el asistente requiere confirmación para proceder (*"¿Me das permiso para...?"*, *"¿Confirmás la acción?"*, *"¿Querés que aplique los cambios?"*).
    - **Herramientas de decisión interactivas**: Intercepta y vocaliza de inmediato herramientas como `question`, `ask_user_choice`, `ask_user_question` o `ask_user_confirmation`.
  - **Inmunidad a código**: Desparásita bloques de código markdown para que preguntas dentro de comentarios o firmas de funciones no disparen falsos positivos.
  - **Auto-acoplamiento inteligente**: Al activarse desde el menú o consola, enciende automáticamente la lectura si estaba apagada.
  - Se activa con `/voice decisions [on|off]` (alias: `decisiones`, `permisos`, `solo-decisiones`) o desde el menú visual interactivo.
- **Traducción Integral al Español para Subagentes**:
  - Los subagentes de la cuadrilla (**Dora**, **Alex**, **Santa**) y el orquestador (**el Gentleman**) **NUNCA leen tareas ni instrucciones en inglés**, aun cuando el harness delegue tareas con enunciados técnicos en inglés.
  - **Traductor síncrono instantáneo (`translateTaskLabel`)**: Traduce verbos de ingeniería y términos técnicos al español en menos de 1 ms (*"map landing page contact form"* $\rightarrow$ *"explorar el formulario de contacto en la landing page"*).
  - **Conjugación por Rol en Primera Persona**: Al concluir, el reporte técnico se conjuga según la personalidad del agente (*"Implementé el formulario..."*, *"Exploré la estructura..."*, *"Verifiqué todas las pruebas..."*).
  - **Barrera de seguridad garantizada**: Si por alguna razón técnica quedara residuo en inglés, el sistema bloquea el audio en inglés y emite una confirmación garantizada en español según el rol.
- **Consumo de Tokens de IA: 100% Offline y Gratis con Kokoro Local**:
  - **Generación de Voz (Kokoro Local)**: 0 tokens (corre en tu propia GPU/CPU local vía ONNX sin costo ni internet).
  - **Detección de Decisiones y Permisos**: 0 tokens (análisis sintáctico local por expresiones regulares).
  - **Traducción de Tareas e Instrucciones**: 0 tokens (motor síncrono compilado en memoria).
  - **Coordinación Multi-Sesión y Cerrojos FIFO**: 0 tokens (Node.js POSIX local).
  - *(Solo consume tokens de forma opcional si decidís usar OpenAI/ElevenLabs en la nube o dictado por micrófono con Whisper).*
- **Landing Page Neo-Brutalista con Formulario de Contacto**:
  - Ubicada en `landing/`, con Terminal Theater animado en vivo con el tema `Gentleman-Sexy-Djr` de Pi CLI, osciloscopio en canvas, soundboard de la cuadrilla, catálogo de voces clonadas y formulario de inscripción accesible con efectos sonoros Web Audio API y persistencia local sin trackers.
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
- **Modo Audio TL;DR con 3 Niveles Granulares vs Lectura Completa**:
  - Alterná entre síntesis ejecutiva y lectura completa palabra por palabra, con feedback transparente y explicativo en el menú visual.
  - **3 Niveles de Detalle TL;DR**:
    - **`high` (Alto)**: Síntesis ejecutiva máxima (1 sola frase contundente, ultra-breve, ~25 palabras).
    - **`medium` (Medio - Predeterminado)**: Resumen balanceado de 2-3 oraciones con resultado y contexto esencial.
    - **`low` (Bajo)**: Alta fidelidad (80-90% de detalle), conservando párrafos completos y omitiendo solo código crudo o tablas.
  - Se configura con `/voice tldr [alto|medio|bajo]` o desde el menú visual interactivo (`▸ Nivel de Resumen: [ Alto / Medio / Bajo ]`).
- **Nombres de Agentes y Roles Configurables**:
  - Personalizá cómo se llaman los 4 integrantes de la cuadrilla:
    - **Explorador (`scoutName`)**: por defecto *"Dora"*.
    - **Programador (`workerName`)**: por defecto *"Alex"*.
    - **Auditor (`reviewerName`)**: por defecto *"Santa"*.
    - **Orquestador (`orchestratorName`)**: por defecto *"el Gentleman"*.
  - **Traspaso de posta dinámico**: Las locuciones de saludo, confirmación y pasaje de tareas entre agentes usan dinámicamente los nombres que elijas (ej: *"Recibido Hermes, tomo la posta. Jefe, arranco a programar..."*).
  - Se configura con `/voice name <scout|worker|reviewer|orchestrator> <nombre>` o desde el menú visual con presets y campo libre.
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
| `/voice decisions [on\|off]` / `/voice decisiones` / `/voice permisos` | Alterna el modo solo decisiones y permisos (habla solo si requiere acción) |
| `/voice tldr [on\|off\|alto\|medio\|bajo]` | Alterna o configura el nivel del resumen ejecutivo (TL;DR) |
| `/voice name <rol> [nombre]` / `/voice nombre` | Consulta o cambia el nombre del subagente (`scout`, `worker`, `reviewer`, `orchestrator`) |
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

### 📖 Guía Completa de Atajos y Controles (Cheat Sheet)

Dentro del menú interactivo (`Alt + V` o `/voice`), podés acceder a la **Guía Completa de Atajos y Controles** tanto desde el menú principal como desde el submenú de atajos:
- **Atajos Globales**: Dictado por micrófono (`Alt+R`), parada inmediata (`Alt+S`), apertura de menú (`Alt+V`) y control de volumen maestro (`Alt+Up` / `Alt+Down`).
- **Navegación TUI**: Desplazamiento (`↑` / `↓`), confirmación (`Enter`) y retorno contextual (`Esc`).
- **Controles de Mouse**: Clic interactivo directo en la barra inferior (Voice, Parar, Volumen, Dictar).
- **Comandos CLI `/voice`**: Referencia rápida de lectura (`read`), resúmenes TL;DR (`tldr [alto|medio|bajo]`), cuadrilla y apelativo (`crew`, `title`), nombres de agentes (`name`), concurrencia (`concurrency`), prefijo de proyecto (`project`) y pruebas (`tests`).
- **Personalización directa**: Enlace rápido para reasignar cualquier tecla global con persistencia automática.

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

El proyecto cuenta con una suite completa de **140 pruebas automatizadas** ejecutadas al 100% directamente sobre el motor nativo de Node.js:

```bash
# Pruebas del plugin TypeScript (103 tests unitarios)
npm test

# Pruebas de la landing page Neo-Brutalista (37 tests unitarios)
node --test landing/landing.test.js
```

Ejecuta las pruebas de:
- `ConfigManager` (carga, persistencia, resolución de claves y flag `decisionsOnly`).
- `DecisionGate` (detección de permisos en español/inglés, opciones múltiples, descarte de bloques de código y herramientas interactivas).
- `TldrSummarizer` (traducción de tareas `translateTaskLabel`, conjugación por rol, extractor de outcomes y barrera de seguridad en español).
- `PlaybackLockManager` (concurrencia multi-sesión, cola FIFO, modo interrupción y modo foco).
- `VoiceMenuComponent` (menú interactivo TUI, navegación de submenús y guía de atajos).
- `TextSanitizer` (filtrado de markdown, bloques de código, tablas y tags `<think>`).
- `TTS Providers` (formateo de payloads y endpoints para Kokoro local, OpenAI, ElevenLabs y Custom HTTP).
- `AudioPlayer` y `AudioRecorder` (detección de binarios CLI y señales de parada).
- `Extension Entrypoint` (registro de comandos `/voice`, compuertas de eventos y anuncios dinámicos de cuadrilla).
- `Landing Page Neo-Brutalista` (semántica HTML5, estilos CSS, accesibilidad, cero emojis genéricos, arpegios Web Audio y persistencia local).

---

## 📚 Documentación Técnica Detallada

Para comprender a fondo el diseño interno, la configuración avanzada y las guías de desarrollo, consultá los siguientes documentos:

- **[Arquitectura del Sistema y Ciclo de Vida de Eventos](docs/architecture.md)**: Diagrama general de flujo, interceptores de ciclo de vida (`tool_execution_start`, `tool_execution_end`, `agent_end`), compuertas de filtrado y subsistemas centrales.
- **[Coordinación Inter-Proceso y Concurrencia Multi-Sesión](docs/concurrency.md)**: Exclusión mutua POSIX en `/tmp/pi-voice-<uid>/`, comparativa de los 4 modos (`queue`, `interrupt`, `focus`, `off`) y prefijo contextual de proyecto.
- **[Referencia Completa de Configuración y Comandos](docs/configuration.md)**: Estructura exhaustiva de `~/.pi/agent/voice.json`, jerarquía de resolución de claves, catálogo de voces y tabla completa de comandos CLI.
- **[Servidor Kokoro Local, Clonación de Voces y Operación 100% Offline](docs/kokoro-offline.md)**: Arquitectura ONNX de 0 tokens, gestión del servicio systemd (`kokoro-tts`), pipeline de clonación a `.npy` y benchmarks de latencia.
- **[Historial de Versiones y Cambios (Changelog)](CHANGELOG.md)**: Registro estructurado de versiones bajo formato Keep a Changelog (v1.1.0 y v1.0.0).
- **[Guía de Contribución y Desarrollo](CONTRIBUTING.md)**: Filosofía de diseño, principios ODD, estándares de TypeScript sin compiladores externos y checklist para Pull Requests.

---

## 📄 Licencia

MIT
