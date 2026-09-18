# Pi Voice Plugin (TTS Universal para Pi CLI) 🎙️

Plugin / Extensión modular para **Pi CLI** que sintetiza en voz las respuestas del asistente utilizando las APIs de cualquier proveedor de inteligencia artificial (OpenAI, ElevenLabs, Groq, Kokoro, Deepgram, LocalAI o endpoints HTTP custom).

---

## 🌟 Características

- **Soporte Universal de Proveedores**:
  - **OpenAI / Compatible** (`/v1/audio/speech`): Compatible de forma nativa con OpenAI (`tts-1`, `tts-1-hd`), Groq, Deepgram, servidores locales Kokoro TTS, LocalAI, vLLM y FastWhisper.
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
| `/voice on` | Activa la lectura automática tras cada respuesta |
| `/voice off` | Desactiva la lectura automática (modo silencioso) |
| `/voice toggle` | Alterna entre lectura automática ON / OFF |
| `/voice read` | Lee en voz alta la última respuesta generada por el asistente |
| `/voice stop` | Detiene inmediatamente la reproducción en curso |
| `/voice test [frase]` | Prueba el sintetizador y el reproductor de audio |
| `/voice status` | Muestra proveedor, voz, velocidad, reproductor y estado actual |
| `/voice provider <tipo>` | Cambia de proveedor (`openai`, `elevenlabs`, `custom`) |
| `/voice voice <nombre>` | Cambia la voz (ej: `nova`, `alloy`, `echo`, `onyx`, o ID de ElevenLabs) |
| `/voice speed <numero>` | Ajusta la velocidad de habla (ej: `1.0`, `1.25`) |
| `/voice filter <modo>` | Tratamiento de código: `omit` (ignorar), `mention` (avisar), `raw` (leer todo) |
| `/voice key <api-key>` | Guarda la clave de API para el proveedor activo en `voice.json` |
| `/voice help` | Muestra la ayuda rápida en pantalla |

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
