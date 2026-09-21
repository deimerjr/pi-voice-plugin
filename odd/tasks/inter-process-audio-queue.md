# Feature: Cola Inter-Proceso de Audio Global (Prevención de voces cruzadas en múltiples sesiones)

Evitar que múltiples sesiones simultáneas de Pi CLI reproduzcan audio al mismo tiempo mezclando sus voces en el servidor de sonido (PipeWire/ALSA). Se implementa un coordinador de bloqueo inter-proceso FIFO (`InterProcessLock`) con recuperación de cerrojos huérfanos (stale locks), modo configurable (`queue`, `interrupt`, `off`) y control desde el menú visual y CLI.

## Tasks

- [x] Task 1: Exploración y diseño del mecanismo de cerrojo y cola FIFO inter-proceso (`gentle-ai-explore` / Dora)
- [x] Task 2: Implementación de InterProcessLock, AudioPlayer queueing y configuración en `src/player.ts`, `src/config.ts`, `src/menu.ts` y tests (`gentle-ai-worker` / Alex)
- [x] Task 3: Auditoría técnica y verificación con simulación de concurrencia inter-proceso (`gentle-ai-verify` / Santa) [commit: d8053ac]
