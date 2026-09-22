# Referencia Completa de Configuración y Comandos

Guía exhaustiva del archivo de configuración `~/.pi/agent/voice.json`, jerarquía de resolución de credenciales, comandos CLI y catálogo de voces de subagentes.

---

## Ubicación del Archivo de Configuración

El archivo de configuración persistente se almacena por defecto en:

```text
~/.pi/agent/voice.json
```

*Nota*: Es posible anular la ruta de configuración definiendo la variable de entorno `PI_VOICE_CONFIG_PATH=/ruta/personalizada/voice.json`.

---

## Jerarquía de Resolución de Configuración y Credenciales

El plugin evalúa las opciones y claves de autenticación en el siguiente orden de precedencia:

```text
1. voice.json (~/.pi/agent/voice.json)      [Máxima prioridad]
          │
          ▼
2. Variables de entorno del sistema         [Prioridad intermedia]
   • OpenAI:     OPENAI_API_KEY | OPENAI_TTS_API_KEY
   • ElevenLabs: ELEVENLABS_API_KEY | XI_API_KEY
   • Whisper STT: GROQ_API_KEY | OPENAI_API_KEY
          │
          ▼
3. Valores predeterminados (DEFAULT_CONFIG) [Fallback seguro]
```

---

## Estructura Completa de `voice.json`

A continuación se presenta una muestra integral con todos los campos disponibles:

```json
{
  "enabled": true,
  "autoRead": false,
  "decisionsOnly": false,
  "tldr": false,
  "tldrLevel": "medium",
  "announceProject": false,
  "mode": "final",
  "filterCode": "omit",
  "provider": "openai",
  "maxCharsPerSpeech": 4000,
  "volume": 1.0,
  "concurrency": "queue",
  "playerCommand": null,
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
  "kokoro": {
    "baseUrl": "http://127.0.0.1:8880/v1",
    "model": "tts-1",
    "voice": "ef_dora",
    "speed": 1.0,
    "format": "wav"
  },
  "custom": {
    "url": "http://localhost:8000/v1/audio/speech",
    "method": "POST",
    "format": "wav",
    "headers": {
      "Content-Type": "application/json"
    }
  },
  "stt": {
    "enabled": true,
    "provider": "openai",
    "baseUrl": "https://api.openai.com/v1",
    "model": "whisper-1",
    "language": "es"
  },
  "shortcuts": {
    "menu": "alt+v",
    "stop": "alt+s",
    "record": "alt+r",
    "volumeUp": "alt+up",
    "volumeDown": "alt+down"
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
    "userTitle": "Jefe",
    "scoutName": "Dora",
    "workerName": "Alex",
    "reviewerName": "Santa",
    "orchestratorName": "el Gentleman"
  }
}
```

---

## Tabla de Opciones de Configuración

### Parámetros Globales

| Clave | Tipo | Valor por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Habilita o deshabilita el subsistema de voz por completo. |
| `autoRead` | `boolean` | `false` | Sintetiza en voz automáticamente cada respuesta generada por el asistente. |
| `decisionsOnly` | `boolean` | `false` | Modo Solo Decisiones y Permisos: la voz solo habla ante preguntas, opciones o solicitudes de confirmación. |
| `tldr` | `boolean` | `false` | Activa el modo de resumen ejecutivo en lugar de lectura completa. |
| `tldrLevel` | `"high" \| "medium" \| "low"` | `"medium"` | Granularidad del resumen: `high` (1 frase), `medium` (2-3 frases), `low` (80-90% detalle). |
| `announceProject` | `boolean` | `false` | Antepone `"En <proyecto>:"` para distinguir qué repositorio está hablando. |
| `mode` | `"final" \| "all"` | `"final"` | Momento de locución: `final` (al concluir la respuesta) o `all` (incluye chunks parciales). |
| `filterCode` | `"omit" \| "mention" \| "raw"` | `"omit"` | Tratamiento de bloques de código: `omit` (ignora), `mention` (avisa bloque), `raw` (lee crudo). |
| `provider` | `"openai" \| "elevenlabs" \| "kokoro" \| "custom"` | `"openai"` | Proveedor de síntesis TTS activo. |
| `maxCharsPerSpeech` | `number` | `4000` | Límite máximo de caracteres enviados al sintetizador en una locución. |
| `volume` | `number` | `1.0` | Nivel de volumen de reproducción (rango `0.0` a `1.5`, donde 1.0 es 100%). |
| `concurrency` | `"queue" \| "interrupt" \| "focus" \| "off"` | `"queue"` | Modo de coordinación inter-proceso entre múltiples terminales de Pi CLI. |
| `playerCommand` | `string \| null` | `null` | Comando personalizado opcional para ejecutar el reproductor de sonido del sistema. |

### Configuración por Proveedor TTS

| Sección | Clave | Tipo | Valor por Defecto | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **`openai`** | `apiKey` | `string` | *(vacío)* | Clave de API para OpenAI (`sk-...`). |
| | `baseUrl` | `string` | `"https://api.openai.com/v1"` | URL base del endpoint compatible con `/v1/audio/speech`. |
| | `model` | `string` | `"tts-1"` | Modelo de síntesis (`tts-1` o `tts-1-hd`). |
| | `voice` | `string` | `"nova"` | Voz predeterminada (`nova`, `alloy`, `echo`, `onyx`, `fable`, `shimmer`). |
| | `speed` | `number` | `1.0` | Velocidad de habla (de `0.25` a `4.0`). |
| | `format` | `string` | `"wav"` | Formato de audio devuelto (`wav`, `mp3`, `opus`, `aac`, `flac`). |
| **`elevenlabs`** | `apiKey` | `string` | *(vacío)* | Clave de API de ElevenLabs (`xi-api-key`). |
| | `baseUrl` | `string` | `"https://api.elevenlabs.io/v1"` | Endpoint base de ElevenLabs. |
| | `voiceId` | `string` | `"21m00Tcm4TlvDq8ikWAM"` | Identificador único de la voz o clon en ElevenLabs. |
| | `modelId` | `string` | `"eleven_multilingual_v2"` | Modelo multilingüe para soporte nativo en español. |
| | `stability` | `number` | `0.5` | Estabilidad de la voz (0.0 a 1.0). |
| | `similarityBoost` | `number` | `0.75` | Refuerzo de similitud de timbre (0.0 a 1.0). |
| **`kokoro`** | `baseUrl` | `string` | `"http://127.0.0.1:8880/v1"` | URL del servidor Kokoro TTS Local (100% offline). |
| | `model` | `string` | `"tts-1"` | Identificador de modelo para compatibilidad OpenAI. |
| | `voice` | `string` | `"ef_dora"` | Voz activa de Kokoro (estándar, clonada o híbrida). |
| | `speed` | `number` | `1.0` | Velocidad de síntesis local. |
| | `format` | `string` | `"wav"` | Formato de audio local (`wav` o `mp3`). |
| **`custom`** | `url` | `string` | `"http://localhost:8000/..."` | URL del endpoint REST personalizado. |
| | `method` | `"POST" \| "GET"` | `"POST"` | Método HTTP utilizado para la solicitud. |
| | `headers` | `object` | `{"Content-Type": ...}` | Cabeceras HTTP enviadas al servicio custom. |

### Configuración de Subagentes y Cuadrilla (`subagents`)

| Clave | Tipo | Valor por Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Habilita las voces diferenciadas y anuncios de subagentes. |
| `crewMode` | `boolean` | `true` | Activa el modo conversacional de cuadrilla y traspaso dinámico de tareas. |
| `announceStart` | `boolean` | `true` | Anuncia oralmente cuando un subagente inicia una tarea asignada. |
| `announceEnd` | `boolean` | `true` | Anuncia el resumen TL;DR del resultado al concluir el subagente. |
| `announceOrchestratorPhases` | `boolean` | `true` | Locución de fases del orquestador en ejecuciones directas (herramienta `todo`). |
| `announceTests` | `boolean` | `true` | Anuncia oralmente la ejecución y resultado de pruebas directas en consola. |
| `userTitle` | `string` | `"Jefe"` | Apelativo con el que los agentes se dirigen al usuario. |
| `orchestrator` | `string` | `"dora_heart"` | Voz asignada al orquestador principal (*el Gentleman*). |
| `scout` | `string` | `"ef_dora"` | Voz asignada a la exploradora (*Dora*). |
| `worker` | `string` | `"em_alex"` | Voz asignada al programador (*Alex*). |
| `reviewer` | `string` | `"em_santa"` | Voz asignada al auditor de calidad (*Santa*). |
| `scoutName` | `string` | `"Dora"` | Nombre visible y oral para el rol de exploración. |
| `workerName` | `string` | `"Alex"` | Nombre visible y oral para el rol de programación. |
| `reviewerName` | `string` | `"Santa"` | Nombre visible y oral para el rol de auditoría. |
| `orchestratorName` | `string` | `"el Gentleman"` | Nombre visible y oral para el orquestador principal. |

---

## Catálogo de Voces de Subagentes

### Voces Oficiales de la Cuadrilla en Español (Kokoro Local)

| Rol | Agente | ID de Voz | Características Vocales |
| :--- | :--- | :--- | :--- |
| **Orquestador** | el Gentleman | `dora_heart` | Híbrida envolvente, dicción suave, presencia equilibrada y cálida. |
| **Exploradora (Scout)** | Dora | `ef_dora` | Femenina ágil, descriptiva, alegre y articulación fluida. |
| **Programador (Worker)** | Alex | `em_alex` | Masculina técnica, directa, resolutiva y cercana. |
| **Auditor (Reviewer)** | Santa | `em_santa` | Masculina profunda, grave, pausada y autoritaria. |

### Voces Clonadas e Híbridas Disponibles

| ID de Voz | Tipo | Descripción y Tono |
| :--- | :--- | :--- |
| `valeria` | Clonada | Femenina ejecutiva, dicción nítida y tono elegante (Clon ElevenLabs). |
| `juan_carlos` | Clonada | Masculina expresiva, enérgica y amistosa (Locutor profesional). |
| `fenrir_es` | Híbrida | Masculina grave, profunda, cinematográfica y seria. |
| `ximena` | Híbrida | Femenina suave, melódica y cálida con acento neutro latino. |
| `mateo` | Híbrida | Masculina juvenil, fresca y dinámica (Híbrida Michael). |
| `adrian` | Híbrida | Masculina madura, segura y con excelente presencia (Híbrida Adam). |

---

## Tabla de Referencia de Comandos CLI `/voice`

| Comando | Parámetros / Opciones | Descripción |
| :--- | :--- | :--- |
| `/voice` o `/voice menu` | *(ninguno)* | Abre el menú visual interactivo con navegación por mouse y teclado. |
| `/voice on` | *(ninguno)* | Activa la lectura automática tras cada respuesta del asistente. |
| `/voice off` | *(ninguno)* | Desactiva la lectura automática (modo silencioso). |
| `/voice toggle` | *(ninguno)* | Alterna el estado de lectura automática (`ON` $\leftrightarrow$ `OFF`). |
| `/voice read` | *(ninguno)* | Sintetiza en voz alta la última respuesta generada. |
| `/voice stop` | *(ninguno)* | Detiene inmediatamente cualquier reproducción de audio en curso (`Alt + S`). |
| `/voice record` | *(ninguno)* | Inicia o detiene la grabación del micrófono para dictado Whisper (`Alt + R`). |
| `/voice decisions` | `[on \| off]` | Activa/desactiva el modo solo decisiones y permisos. |
| `/voice tldr` | `[on \| off \| alto \| medio \| bajo]` | Alterna el modo resumen o fija su nivel (`high`, `medium`, `low`). |
| `/voice concurrency` | `[queue \| interrupt \| focus \| off]` | Configura el modo de coordinación entre múltiples sesiones de terminal. |
| `/voice project` | `[on \| off]` | Antepone `"En <proyecto>:"` al hablar para identificar la terminal activa. |
| `/voice crew` | `[on \| off]` | Alterna el modo conversacional de cuadrilla y traspaso dinámico. |
| `/voice title` o `/voice jefe` | `<nombre>` | Configura el apelativo con el que los agentes llaman al usuario (ej: *"Comandante"*). |
| `/voice name` | `<rol> <nombre>` | Cambia el nombre de un integrante (`scout`, `worker`, `reviewer`, `orchestrator`). |
| `/voice agents` | `[on \| off]` | Activa o silencia las voces diferenciadas para subagentes. |
| `/voice phases` | `[on \| off]` | Activa o silencia la locución de fases directas del orquestador. |
| `/voice tests` | `[on \| off]` | Alterna el anuncio oral de pruebas directas en consola. |
| `/voice provider` | `<kokoro \| openai \| elevenlabs \| custom>` | Cambia el proveedor de síntesis activo. |
| `/voice voice` | `<nombre_voz>` | Cambia la voz del proveedor activo. |
| `/voice volume` | `<0-150>` | Ajusta el volumen de salida de audio (porcentaje). |
| `/voice speed` | `<0.25 - 4.0>` | Ajusta la velocidad de habla. |
| `/voice filter` | `<omit \| mention \| raw>` | Configura el filtrado de bloques de código markdown. |
| `/voice key` | `<api-key>` | Guarda y sanitiza la clave de API para el proveedor activo en `voice.json`. |
| `/voice shortcut` | `<accion> <tecla>` | Reasigna un atajo de teclado global (`menu`, `stop`, `record`, etc.). |
| `/voice custom` | `<url \| method \| format \| activate>` | Configura parámetros para el proveedor HTTP personalizado. |
| `/voice status` | *(ninguno)* | Muestra en pantalla el estado completo del sistema de voz. |
| `/voice test` | `[frase opcional]` | Reproduce un audio de prueba para verificar conectividad y altavoces. |
| `/voice help` | *(ninguno)* | Imprime la guía rápida de comandos en la consola. |
