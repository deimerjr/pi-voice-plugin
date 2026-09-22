# Coordinación Inter-Proceso y Concurrencia Multi-Sesión

Mecanismo de sincronización y exclusión mutua de audio entre múltiples instancias simultáneas de Pi CLI.

---

## El Problema de la Concurrencia Multi-Sesión

Cuando un desarrollador trabaja con múltiples terminales o repositorios abiertos en paralelo con Pi CLI:
1. **Colisión de salidas de audio**: Dos o más instancias del asistente pueden responder casi simultáneamente, enviando flujos de audio paralelos al mismo dispositivo (ALSA/PipeWire/PulseAudio).
2. **Cacofonía ininteligible**: Las voces de subagentes y orquestadores se mezclan, haciendo imposible comprender instrucciones o solicitudes de permisos.
3. **Pérdida de contexto**: Sin identificación de proyecto, el usuario escucha avisos técnicos sin saber a cuál de las ventanas abiertas corresponde.

Para resolver esto, **Pi Voice Plugin** implementa un coordinador inter-proceso POSIX a nivel de sistema operativo que serializa o arbitra el acceso al hardware de sonido.

---

## Arquitectura de Coordinación Inter-Proceso

El coordinador opera en el directorio temporal del usuario:

```text
/tmp/pi-voice-<username>/
├── playback.lock          # Cerrojo atómico activo con metadatos JSON
├── active_session.json    # Identificador y timestamp de la sesión en foco
└── queue/                 # Directorio de tickets lexicográficos FIFO
    ├── ticket-1726850000100-a1b2.json
    └── ticket-1726850000250-c3d4.json
```

### Metadatos del Cerrojo Atómico (`playback.lock`)
El archivo `playback.lock` almacena un registro JSON con la identidad del dueño:

```json
{
  "sessionPid": 14205,
  "playerPid": 14289,
  "createdAt": 1726850000000,
  "heartbeat": 1726850002000,
  "maxDurationMs": 60000
}
```

### Reglas de Seguridad y Validación de Procesos
- **Validación de PIDs vivos**: Mediante `process.kill(pid, 0)` se verifica si el proceso dueño del cerrojo sigue existiendo en la tabla del sistema operativo.
- **Recuperación de cerrojos huérfanos (Stale Locks)**: Si una sesión de Pi se cierra abruptamente (`SIGKILL` o crash del terminal), la siguiente sesión detecta que el `sessionPid` ya no existe y reclama el cerrojo atómicamente.
- **Latido periódico (Heartbeat)**: Si un proceso se cuelga sin terminar, el cerrojo expira automáticamente tras superar `maxDurationMs` (60 segundos por defecto).
- **Liberación limpia en señales**: Manejadores de `exit`, `SIGINT` y `SIGTERM` garantizan la liberación inmediata del archivo de cerrojo al salir.

---

## Comparativa Detallada de los 4 Modos

| Modo | Comando CLI | Comportamiento | Caso de Uso Ideal |
| :--- | :--- | :--- | :--- |
| **`queue`** *(Recomendado / Default)* | `/voice concurrency queue` | **Cola FIFO atómica**. Las sesiones esperan su turno y hablan una tras otra en estricto orden cronológico. | Flujo de trabajo habitual con múltiples terminales donde no se quiere perder ningún anuncio. |
| **`interrupt`** | `/voice concurrency interrupt` | **Preempción inmediata (Takeover)**. La sesión más reciente cancela el audio en curso de otra sesión con `SIGKILL` y reproduce de inmediato. | Respuestas prioritarias o usuarios que solo desean escuchar lo último generado. |
| **`focus`** | `/voice concurrency focus` | **Seguimiento de foco**. Solo habla la terminal en la que el usuario interactuó más recientemente; las terminales de fondo permanecen en silencio. | Múltiples agentes autónomos corriendo en background mientras se programa activamente en una sesión. |
| **`off`** | `/voice concurrency off` | **Bypass directo**. Desactiva la sincronización inter-proceso; los audios se reproducen en paralelo. | Pruebas de hardware o depuración directa del reproductor de sonido. |

---

## Detalle Operativo por Modo

### 1. Modo Cola FIFO (`queue`)
1. Al requerir reproducir audio, la sesión crea un archivo de ticket con marca de tiempo lexicográfica en `/tmp/pi-voice-<uid>/queue/ticket-<timestamp>-<hash>.json`.
2. La sesión monitorea el directorio de cola (`queue/`).
3. El ticket con la menor marca de tiempo obtiene el derecho de adquirir `playback.lock`.
4. Una vez terminado el audio (o si el usuario presiona `Alt + S` / `/voice stop`), el ticket se destruye y la siguiente sesión en espera comienza a hablar inmediatamente.
5. Si el usuario cancela la espera, el ticket se purga sin bloquear el resto de la cola.

### 2. Modo Interrupción (`interrupt`)
1. La nueva sesión inspecciona `playback.lock`.
2. Si otra sesión está reproduciendo audio, lee su `playerPid` y le envía una señal `SIGTERM` seguida de `SIGKILL`.
3. Sobrescribe atómicamente el cerrojo con su propio `sessionPid` y `playerPid`.
4. El audio anterior se corta al instante y comienza la reproducción de la sesión actual sin esperas.

### 3. Modo Foco (`focus`)
1. Cada vez que el usuario interactúa con una sesión (envía un prompt, ejecuta un comando `/voice`, abre el menú con `Alt + V` o presiona atajos), dicha sesión actualiza `/tmp/pi-voice-<uid>/active_session.json` con su `sessionPid` y marca de tiempo.
2. Cuando un subagente o asistente intenta hablar, verifica si su `sessionPid` coincide con la sesión en foco.
3. Si la sesión está en segundo plano, la reproducción se suprime silenciosamente (`FocusSuppressionError`).
4. Si la sesión tiene el foco, adquiere el cerrojo aplicando takeover sobre cualquier audio residual.

---

## Prefijo Contextual de Proyecto (`announceProject`)

Para identificar inequívocamente qué sesión o terminal está hablando cuando se opera con múltiples ventanas:

- **Activación vía CLI**:
  ```bash
  /voice project on
  # o
  /voice proyecto on
  ```
- **Comportamiento**:
  El plugin resuelve el nombre base del directorio de trabajo actual (`path.basename(process.cwd())`) y antepone un prefijo claro en las locuciones del orquestador y los subagentes:
  > *"En Voz: Alex arranca con la tarea..."*
  > *"En Gentle-Pi: Santa auditó los cambios y aprobó el Pull Request."*
- **Prevención de duplicaciones**:
  Si el texto ya contiene el prefijo del proyecto o proviene de una cita formateada, el generador evita redundancias sintácticas.
