# Arquitectura del Sistema y Ciclo de Vida de Eventos

Arquitectura técnica integral de **Pi Voice Plugin**: ciclo de vida de eventos en Pi CLI, compuertas de filtrado heurístico, pipeline de traducción gramatical, sincronización inter-proceso y subsistema de reproducción de audio.

---

## Diagrama General de Arquitectura

```text
                     EVENTOS DE PI CLI
    [tool_execution_start]   [tool_execution_end]       [agent_end]
             │                       │                       │
             ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │  Interceptores  │     │  Extracción de  │     │  DecisionGate   │
    │  de Subagentes, │     │   Outcomes &    │     │  (decisionsOnly │
    │   Fases & Tests │     │ Resúmenes TL;DR │     │    y autoRead)  │
    └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
             │                       │                       │
             └───────────────────────┼───────────────────────┘
                                     │
                                     ▼
                        ┌─────────────────────────┐
                        │   TextSanitizer &       │
                        │   Traductor Español     │
                        │ (Filtro think/markdown) │
                        └────────────┬────────────┘
                                     │
                                     ▼
                        ┌─────────────────────────┐
                        │   TTS Provider Factory  │
                        │ ─────────────────────── │
                        │ • Kokoro TTS (Local)    │
                        │ • OpenAI / Compatible   │
                        │ • ElevenLabs            │
                        │ • Custom HTTP           │
                        └────────────┬────────────┘
                                     │ [WAV / MP3 Buffer]
                                     ▼
                        ┌─────────────────────────┐
                        │   PlaybackLockManager   │
                        │ (/tmp/pi-voice-<uid>/)  │
                        │ ─────────────────────── │
                        │ • queue (FIFO atómico)  │
                        │ • interrupt (Takeover)  │
                        │ • focus (Sesión activa) │
                        │ • off (Bypass directo)  │
                        └────────────┬────────────┘
                                     │
                                     ▼
                        ┌─────────────────────────┐
                        │       AudioPlayer       │
                        │ ─────────────────────── │
                        │ • pw-play / aplay       │
                        │ • Escalamiento PCM 16b  │
                        │ • Cancelación SIGKILL   │
                        └─────────────────────────┘
```

---

## Ciclo de Vida de Eventos e Interceptores en Pi

El plugin se integra de forma transparente en el harness de Pi suscribiéndose a tres hooks principales del ciclo de vida del agente:

### 1. `tool_execution_start`
Se activa antes de que cualquier herramienta de Pi comience a ejecutarse. Se utiliza para:
- **Lanzamiento de Subagentes (`subagent_run`, `subagent_spawn`)**:
  - Detecta el rol delegado (`gentle-ai-explore` / Dora, `gentle-ai-worker` / Alex, `gentle-ai-verify` / Santa).
  - Traduce en tiempo real (<1 ms) la etiqueta de la tarea en inglés (`task`, `label` o `prompt`) mediante `translateTaskLabel`.
  - Emite la locución en español de inicio y traspaso de posta entre agentes con el timbre asignado.
- **Fases del Orquestador (`todo`)**:
  - Si el orquestador trabaja sin subagentes (desarrollo ODD directo), anuncia la planificación inicial y el inicio de cada fase (*"Jefe, arranco la fase: [nombre]..."*).
- **Ejecución Directa de Pruebas (`bash`)**:
  - Intercepta comandos de pruebas (`npm test`, `pytest`, `cargo test`, etc.) ejecutados por el orquestador.
  - Implementa un mecanismo de enfriamiento (debounce de 30 segundos) para evitar spam oral si se relanzan tests de forma continua.
  - Suprime el aviso si hay un subagente activo para evitar colisiones de locución.
- **Herramientas de Decisión Interactivas (`question`, `ask_user_choice`, etc.)**:
  - En modo `decisionsOnly`, intercepta herramientas interactivas, extrae las opciones o mensajes y vocaliza inmediatamente la consulta, asegurando que el usuario reciba la notificación aunque el resto de eventos esté silenciado.

### 2. `tool_execution_end`
Se activa cuando una herramienta concluye su ejecución:
- **Finalización de Subagentes**:
  - Extrae el desenlace estructurado mediante `extractSubagentOutcome` a partir de bloques YAML (`summary:`, `outcome:`) o encabezados Markdown (`## Summary`, `## Outcome`).
  - Aplica el motor de resumen `TldrSummarizer` conjugando los verbos en primera persona según el rol del agente (*"Implementé..."*, *"Exploré..."*, *"Verifiqué..."*).
  - Pasa por la barrera de seguridad garantizada en español antes de enviar los bytes de audio al reproductor.
- **Resultados de Pruebas de Verificación**:
  - Analiza el código de salida del proceso (`exitCode === 0`) y anuncia si la suite de pruebas pasó con éxito o falló.

### 3. `agent_end`
Se activa cuando el modelo principal (el asistente/orquestador) finaliza la generación de un mensaje para el usuario:
- **Filtrado por `decisionsOnly`**:
  - Si el modo está activo, analiza el texto generado con `DecisionGate.evaluateAssistantText`.
  - Solo reproduce audio si se detectan solicitudes de permiso explícitas o preguntas con alternativas para elegir.
  - Si el mensaje es puramente informativo, descarta la reproducción en silencio.
- **Manejo de `autoRead`**:
  - Si `decisionsOnly` no está activo, respeta la bandera global `autoRead` para sintetizar la respuesta completa o el resumen ejecutivo TL;DR según la configuración.

---

## Desglose de Módulos Centrales

| Módulo | Responsabilidad Principal |
| :--- | :--- |
| `src/index.ts` | Orquestador central del plugin, suscripción a eventos de Pi, enrutador de comandos CLI `/voice` y componente de interfaz de estado. |
| `src/decision-gate.ts` | Motor heurístico de evaluación de decisiones y permisos. Desparasitado de bloques de código y parsing de herramientas interactivas. |
| `src/tldr.ts` | Pipeline de traducción síncrona (<1 ms), extracción semántica de outcomes, conjugación por rol y síntesis de resúmenes TL;DR (3 niveles). |
| `src/lock.ts` | Coordinador inter-proceso POSIX: cerrojos atómicos, ordenamiento de cola FIFO, purga de procesos huérfanos y rastreo de terminal en foco. |
| `src/menu.ts` | Máquina de estados para la interfaz TUI a pantalla completa: overlays modales, menús contextuales, selectores radio y atajos. |
| `src/sanitizer.ts` | Limpieza determinista de sintaxis Markdown, tablas, URLs, bloques de código cercados y eliminación de tags `<think>` de modelos de razonamiento. |
| `src/player.ts` & `src/recorder.ts` | Interfaz con hardware de audio: detección dinámica de binarios CLI (`pw-play`, `arecord`), escalamiento PCM 16-bit y parada con `SIGKILL`. |
| `src/providers/` | Factoría y adaptadores polimórficos para Kokoro TTS local, OpenAI, ElevenLabs y Custom HTTP. |

---

## Detalle de Componentes y Flujos de Datos

### 1. Desparasitado y Evaluación Heurística (`src/decision-gate.ts`)
Para evitar que bloques de código técnico disparen la voz por contener signos de interrogación en firmas o comentarios, el flujo opera en dos etapas:
1. `stripCodeBlocks`: Elimina bloques de código cercados (```` ```...``` ````) e inline (`` `...` ``).
2. `evaluateAssistantText`: Aplica patrones regex de permisos y opciones sobre la prosa limpia restante, omitiendo además encabezados que planteen preguntas retóricas.

### 2. Motor de Traducción y Conjugación (`src/tldr.ts`)
Garantiza que ningún subagente hable en inglés crudo:
- **`translateTaskLabel(label)`**: Convierte enunciados imperativos de tareas técnicas en infinitivo o gerundio natural en español (*"map landing page"* $\rightarrow$ *"explorar el formulario de contacto en la landing page"*).
- **`translateEnglishSentence(text, options)`**: Detecta el rol del subagente y conjuga los verbos de acción en primera persona del pretérito perfecto simple (*"I explored"* $\rightarrow$ *"exploré"*, *"I implemented"* $\rightarrow$ *"implementé"*).
- **Barrera de seguridad**: Si un texto en inglés no logra traducirse vía LLM, el traductor determinista local reemplaza términos clave y genera una confirmación válida en español.

### 3. Factoría de Proveedores TTS (`src/providers/`)
Todos los adaptadores implementan la interfaz `TTSProvider`:
```typescript
export interface SynthesisResult {
  audioBuffer: Buffer;
  format: "wav" | "mp3" | "opus" | "aac" | "flac";
}

export interface TTSProvider {
  readonly id: string;
  readonly name: string;
  synthesize(text: string, signal?: AbortSignal): Promise<SynthesisResult>;
}
```
- **`KokoroProvider`**: Envía solicitudes POST a `http://127.0.0.1:8880/v1/audio/speech`. No requiere API keys y produce buffers de audio WAV locales.
- **`OpenAIProvider`**: Soporta `tts-1` y `tts-1-hd` con streaming y compresión configurable.
- **`ElevenLabsProvider`**: Utiliza el endpoint REST oficial con headers `xi-api-key` y control de estabilidad.
- **`CustomHttpProvider`**: Admite plantillas de payload y métodos POST/GET configurables para backends REST propios.
