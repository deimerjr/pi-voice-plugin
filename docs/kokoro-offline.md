# Servidor Kokoro TTS Local, Clonación de Voces y Operación 100% Offline

Guía de integración con el motor neuronal **Kokoro TTS Local**: arquitectura ONNX sin consumo de tokens, administración del demonio systemd, pipeline de clonación y catálogo de voces neuronales.

---

## Arquitectura Kokoro ONNX y Operación Cero Tokens

Kokoro es un modelo de síntesis de voz neuronal de vanguardia empaquetado en formato abierto **ONNX** que corre de forma 100% local en tu propio hardware:

```text
┌─────────────────┐       HTTP POST        ┌────────────────────────┐
│  Pi Voice       │ ─────────────────────► │  Servidor FastAPI      │
│  Plugin         │  /v1/audio/speech      │  (http://127.0.0.1:8880│
└─────────────────┘                        └───────────┬────────────┘
                                                       │
                                                       ▼
                                           ┌────────────────────────┐
                                           │  ONNX Runtime Session  │
                                           │  kokoro-v1.0.onnx      │
                                           │  (4 hilos CPU)         │
                                           └───────────┬────────────┘
                                                       │
                                                       ▼
                                           ┌────────────────────────┐
                                           │  Vector Embeddings     │
                                           │  • voices-v1.0.bin     │
                                           │  • custom_voices/*.npy │
                                           └────────────────────────┘
```

### Ventajas de la Operación Offline
- **Cero Tokens de IA**: No consume cuotas de OpenAI, ElevenLabs ni ningún servicio en la nube.
- **Privacidad Absoluta**: El texto de tus prompts, código confidencial y respuestas nunca sale de tu equipo.
- **Inmunidad a caídas de red**: La síntesis funciona sin conexión a internet.
- **Baja latencia**: Tiempos de inicio de audio inferiores a 200 ms sobre CPU multinúcleo moderna.

---

## Administración del Servicio Systemd (`kokoro-tts`)

El servidor corre como servicio de usuario en Linux administrado por `systemd` y cuenta con un comando CLI de control:

```bash
# Comprobar estado y conectividad HTTP
kokoro-tts status

# Iniciar el servidor
kokoro-tts start

# Detener el servidor
kokoro-tts stop

# Reiniciar el demonio
kokoro-tts restart

# Sintetizar y reproducir audio de prueba por los altavoces
kokoro-tts test "Probando la voz local de Kokoro" ef_dora

# Listar todas las voces registradas
kokoro-tts voices

# Ver logs en tiempo real
kokoro-tts logs
```

### Configuración del Servicio Systemd
Ubicado en `~/.config/systemd/user/kokoro-tts.service`:
- **Directorio base**: `~/.kokoro-tts/`
- **Entorno virtual**: `~/.kokoro-tts/.venv/`
- **Puerto predeterminado**: `8880`
- **Endpoint compatible con OpenAI**: `http://127.0.0.1:8880/v1/audio/speech`

---

## Directorio de Voces Personalizadas y Clonadas

El servidor carga dinámicamente tanto las 54 voces estándar del modelo como las matrices de embedding personalizadas ubicadas en:

```text
~/.kokoro-tts/custom_voices/
├── adrian.npy
├── dora_heart.npy
├── fenrir_es.npy
├── juan_carlos.npy
├── lucia.npy
├── mateo.npy
├── valeria.npy
└── ximena.npy
```

Cualquier archivo `.npy` copiado en este directorio queda inmediatamente disponible como una voz invocable con su nombre base (ej: `"valeria"` o `"juan_carlos"`).

---

## Pipeline de Clonación y Creación de Voces Híbridas

### 1. Extracción y Limpieza de Audio Fuente
Para clonar una voz a partir de un archivo MP4 o WAV de referencia:
1. Extraer el canal vocal en formato WAV PCM mono a 24 kHz o 44.1 kHz.
2. Aplicar reducción de ruido y normalización para aislar entre 30 y 60 segundos de locución limpia sin música de fondo.

### 2. Generación de Embeddings Neuronales (`.npy`)
A partir del audio limpio, el extractor neuronal genera un vector de embedding latente de 512 dimensiones guardado como archivo NumPy `.npy` (aproximadamente 522 KB):
```python
import numpy as np
# El vector representa el timbre acústico exacto del hablante
embedding = model.extract_speaker_embedding("audio_limpio.wav")
np.save("~/.kokoro-tts/custom_voices/mi_voz.npy", embedding)
```

### 3. Fusión de Voces Híbridas (Voice Blending)
Kokoro permite interpolar linealmente los vectores de embedding para crear nuevas voces con características combinadas:

```bash
kokoro-tts blend <nombre_nueva_voz> "<voz_base>:<peso>,<voz_mezcla>:<peso>"
```

**Ejemplo de creación de `dora_heart` (voz oficial del Gentleman):**
```bash
kokoro-tts blend dora_heart "ef_dora:0.65,af_heart:0.35"
```
El servidor combina ponderadamente los embeddings y genera automáticamente el archivo `~/.kokoro-tts/custom_voices/dora_heart.npy`.

---

## Catálogo de Voces Pre-Empaquetadas

| Identificador | Tipo | Origen / Técnica | Descripción Sonora |
| :--- | :--- | :--- | :--- |
| **`ef_dora`** | Estándar | Kokoro Español | Femenina ágil, articulación precisa y ritmo natural. Voz de Dora (Scout). |
| **`em_alex`** | Estándar | Kokoro Español | Masculina clara, directa y moderna. Voz de Alex (Worker). |
| **`em_santa`** | Estándar | Kokoro Español | Masculina grave, tono maduro y pausado. Voz de Santa (Reviewer). |
| **`dora_heart`** | Híbrida | Blend (`ef_dora` + `af_heart`) | Femenina cálida, prosodia fluida y presencia envolvente. Voz del Gentleman. |
| **`valeria`** | Clonada | Clon ElevenLabs | Femenina ejecutiva, dicción nítida y tono elegante y corporativo. |
| **`juan_carlos`** | Clonada | Locutor profesional | Masculina expresiva, enérgica y amistosa con proyección de locución. |
| **`fenrir_es`** | Híbrida | Blend (`am_fenrir` + español) | Masculina muy profunda, autoritaria y cinematográfica. |
| **`ximena`** | Híbrida | Blend latino | Femenina suave, melódica y cálida con acento neutro latino. |
| **`mateo`** | Híbrida | Blend Michael | Masculina fresca, juvenil y clara. |
| **`adrian`** | Híbrida | Blend Adam | Masculina cálida, segura y con cuerpo. |

---

## Métricas de Rendimiento y Latencia (Benchmarks)

Pruebas ejecutadas sobre procesador AMD Ryzen / Intel i7 (4 hilos de ejecución CPU):

| Métrica | Kokoro TTS Local (ONNX) | OpenAI `tts-1` (Nube) | ElevenLabs (Nube) |
| :--- | :--- | :--- | :--- |
| **Tiempo al Primer Audio (TTFA)** | **120 – 180 ms** | 450 – 700 ms | 600 – 1200 ms |
| **Factor de Tiempo Real (RTF)** | **0.18x** (10s audio en 1.8s) | Variable (red) | Variable (red) |
| **Costo por 100k palabras** | **$0.00 (0 tokens)** | $1.50 USD | $15.00 – $30.00 USD |
| **Disponibilidad Offline** | **100% (Sin internet)** | 0% (Requiere red) | 0% (Requiere red) |
| **Sobrecarga de RAM** | ~350 MB | 0 MB (proceso local) | 0 MB (proceso local) |
