import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { Component, Theme, TuiMouseEvent, TuiMouseEventResult } from "@earendil-works/pi-tui";
import { visibleWidth } from "@earendil-works/pi-tui";
import {
  ConfigManager,
  type VoicePluginConfig,
  type CodeFilterMode,
  type SpeechProviderType,
} from "./config.ts";
import { TextSanitizer } from "./sanitizer.ts";
import { createTTSProvider } from "./providers/factory.ts";
import { AudioPlayer } from "./player.ts";
import { AudioRecorder } from "./recorder.ts";
import { AudioTranscriber } from "./transcriber.ts";
import { TldrSummarizer } from "./tldr.ts";
import { VoiceMenuComponent, type MenuScreen } from "./menu.ts";

export class VoiceControlBarComponent implements Component {
  private theme: Theme;
  private isPlaying: () => boolean;
  private isRecording: () => boolean;
  private getVolume: () => number;
  private onStop: () => void;
  private onRecordClick: () => void;
  private onVolumeClick: () => void;

  private stopWidth: number = 0;
  private recStart: number = 0;
  private recWidth: number = 0;
  private volStart: number = 0;
  private volWidth: number = 0;

  constructor(
    theme: Theme,
    isPlaying: () => boolean,
    isRecording: () => boolean,
    getVolume: () => number,
    onStop: () => void,
    onRecordClick: () => void,
    onVolumeClick: () => void
  ) {
    this.theme = theme;
    this.isPlaying = isPlaying;
    this.isRecording = isRecording;
    this.getVolume = getVolume;
    this.onStop = onStop;
    this.onRecordClick = onRecordClick;
    this.onVolumeClick = onVolumeClick;
  }

  render(_width: number): string[] {
    try {
      const playing = this.isPlaying();
      const recording = this.isRecording();
      const vol = this.getVolume();
      const pct = Math.round(vol * 100);

      const speakerIcon = pct === 0 ? "🔇" : pct < 40 ? "🔈" : pct < 75 ? "🔉" : "🔊";

      // 1. Stop button
      const stopRaw = playing ? " [ ⏹️ Detener ] " : " [ ⏹️ Parar ] ";
      const stopFormatted = playing
        ? this.theme.fg("error", this.theme.bold(stopRaw))
        : this.theme.fg("dim", stopRaw);
      this.stopWidth = visibleWidth(stopRaw);

      // 2. Dictate / Record button
      const recRaw = recording ? " [ 🔴 Grabando... ] " : " [ 🎙️ Dictar ] ";
      const recFormatted = recording
        ? this.theme.fg("error", this.theme.bold(recRaw))
        : this.theme.fg("accent", recRaw);
      this.recStart = this.stopWidth + 1;
      this.recWidth = visibleWidth(recRaw);

      // 3. Speaker / Volume button
      const volRaw = ` [ ${speakerIcon} ${pct}% ] `;
      const volFormatted = this.theme.fg(playing ? "accent" : "muted", volRaw);
      this.volStart = this.recStart + this.recWidth + 1;
      this.volWidth = visibleWidth(volRaw);

      return [`${stopFormatted} ${recFormatted} ${volFormatted}`];
    } catch {
      return [" [ ⏹️ Parar ]  [ 🎙️ Dictar ]  [ 🔊 ] "];
    }
  }

  handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
    if (event.button !== "left") return undefined;

    const clickX = event.x;
    const isOverStop = clickX >= 0 && clickX <= this.stopWidth;
    const isOverRec = clickX > this.stopWidth && clickX <= this.recStart + this.recWidth;
    const isOverVol = clickX > this.recStart + this.recWidth;

    if (!isOverStop && !isOverRec && !isOverVol) return undefined;

    if (event.type === "press") {
      return { handled: true };
    }

    if (event.type === "click") {
      if (isOverStop) {
        setTimeout(() => this.onStop(), 0);
        return { handled: true };
      }
      if (isOverRec) {
        setTimeout(() => this.onRecordClick(), 0);
        return { handled: true };
      }
      if (isOverVol) {
        setTimeout(() => this.onVolumeClick(), 0);
        return { handled: true };
      }
    }

    return undefined;
  }

  invalidate(): void {}
}

export interface SubagentRoleInfo {
  role: string;
  name: string;
  voice: string;
}

export function resolveSubagentVoice(
  agentName: string,
  config: VoicePluginConfig
): SubagentRoleInfo {
  const lower = (agentName || "").toLowerCase();
  const sub = config.subagents || {
    enabled: true,
    crewMode: true,
    announceStart: true,
    announceEnd: true,
    announceOrchestratorPhases: true,
    orchestrator: "dora_heart",
    scout: "ef_dora",
    worker: "em_alex",
    reviewer: "em_santa",
  };

  if (/scout|explore|plan|investig/i.test(lower)) {
    return { role: "Exploradora", name: "Dora", voice: sub.scout || "ef_dora" };
  }
  if (/verify|reviewer|judge|audit|review/i.test(lower)) {
    return { role: "Auditor", name: "Santa", voice: sub.reviewer || "em_santa" };
  }
  if (/worker|implement|apply|code|dev/i.test(lower)) {
    return { role: "Programador", name: "Alex", voice: sub.worker || "em_alex" };
  }

  return { role: "Agente", name: "Alex", voice: sub.worker || "em_alex" };
}

export function cleanPhaseTitle(rawText?: string): string {
  if (!rawText) return "";
  let clean = rawText.trim();
  // Strip "Task 1:", "Task 1 -", "#1", "[x]", "[ ]", etc.
  clean = clean.replace(/^(?:Task\s*\d+\s*[:\-–—]\s*|#\d+\s*[:\-–—]?\s*)/i, "");
  // Strip markdown formatting
  clean = clean.replace(/[`*_~[\]]/g, "");
  // Translate common English technical phrases to Spanish
  clean = TldrSummarizer.quickTranslateCommonEnglish(clean);
  // Cap at 100 chars
  if (clean.length > 100) {
    clean = clean.slice(0, 97) + "...";
  }
  return clean.trim();
}

function extractTextFromResult(result: any): string {
  if (!result) return "";
  if (typeof result === "string") return result;
  if (result.content && Array.isArray(result.content)) {
    return result.content
      .filter((c: any) => c.type === "text" && typeof c.text === "string")
      .map((c: any) => c.text)
      .join("\n");
  }
  if (result.answer && typeof result.answer === "string") return result.answer;
  if (result.output && typeof result.output === "string") return result.output;
  return "";
}

export default function (pi: ExtensionAPI) {
  const configManager = new ConfigManager();
  let config: VoicePluginConfig = configManager.getConfig();

  const player = new AudioPlayer({
    customCommand: config.playerCommand,
    volume: config.volume ?? 1.0,
  });

  const recorder = new AudioRecorder();

  let lastAssistantText = "";
  let isSynthesizing = false;
  let currentAbortController: AbortController | null = null;

  const stopPlayback = (ctx?: ExtensionContext) => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    if (recorder.isRecording()) {
      recorder.cancelRecording();
      if (ctx?.ui) {
        ctx.ui.notify("⏹️ Grabación cancelada", "info");
      }
    }
    player.stop();
    isSynthesizing = false;
    updateUiState(ctx);
  };

  const toggleRecording = async (ctx: ExtensionContext): Promise<void> => {
    if (recorder.isRecording()) {
      // Stop and transcribe
      if (ctx.ui) {
        ctx.ui.setStatus("pi-voice", "⏳ Transcribiendo dictado...");
        ctx.ui.notify("⏳ Transcribiendo voz con Whisper...", "info");
      }
      updateUiState(ctx);

      try {
        const audioBuffer = await recorder.stopRecording();
        const apiKey = configManager.getActiveSTTApiKey();
        const transcriber = new AudioTranscriber({
          ...config.stt,
          apiKey,
        });
        const text = await transcriber.transcribe(audioBuffer);
        if (text && text.trim()) {
          const cleanText = text.trim();
          if (ctx.ui?.pasteToEditor) {
            ctx.ui.pasteToEditor(cleanText);
          } else if (ctx.ui?.setEditorText) {
            const current = ctx.ui.getEditorText ? ctx.ui.getEditorText() : "";
            const combined = current.trim() ? `${current} ${cleanText}` : cleanText;
            ctx.ui.setEditorText(combined);
          }
          if (ctx.ui) {
            ctx.ui.notify(`🎙️ Transcripción: "${cleanText}"`, "info");
          }
        } else {
          if (ctx.ui) {
            ctx.ui.notify("No se detectó voz en la grabación.", "warning");
          }
        }
      } catch (err: any) {
        if (ctx.ui) {
          ctx.ui.notify(`[STT] Error de transcripción: ${err.message}`, "error");
        }
      } finally {
        updateUiState(ctx);
      }
    } else {
      // Start recording
      stopPlayback(ctx);
      try {
        await recorder.startRecording();
        if (ctx.ui) {
          ctx.ui.setStatus("pi-voice", "🔴 GRABANDO... (Alt+R para enviar)");
          ctx.ui.notify("🎙️ Grabando... Hablá y presioná Alt+R para transcribir", "info");
        }
        updateUiState(ctx);
      } catch (err: any) {
        if (ctx.ui) {
          ctx.ui.notify(`[STT] Error al iniciar grabación: ${err.message}`, "error");
        }
      }
    }
  };

  const updateUiState = (ctx?: ExtensionContext) => {
    if (!ctx?.ui) return;
    const statusIcon = config.autoRead ? "🔊" : "🔇";
    const providerLabel =
      config.provider === "openai"
        ? config.openai.voice
        : config.provider === "kokoro"
        ? config.kokoro.voice
        : config.provider === "elevenlabs"
        ? config.elevenlabs.voiceId
        : "custom";

    const volPct = Math.round((config.volume ?? 1.0) * 100);
    const tldrTag = config.tldr ? " • TL;DR" : "";

    // 1. Footer status
    if (recorder.isRecording()) {
      ctx.ui.setStatus("pi-voice", "🔴 GRABANDO AUDIO... (Alt+R para enviar)");
    } else {
      ctx.ui.setStatus(
        "pi-voice",
        `Voice: ${statusIcon} ${config.autoRead ? "ON" : "OFF"} (${providerLabel} • ${volPct}%${tldrTag})`
      );
    }

    // 2. Interactive control bar widget below editor
    if (ctx.hasUI && ctx.mode === "tui") {
      ctx.ui.setWidget(
        "pi-voice-controls",
        (_tui, theme) => {
          return new VoiceControlBarComponent(
            theme,
            () => isSynthesizing || player.isPlaying(),
            () => recorder.isRecording(),
            () => config.volume ?? 1.0,
            () => {
              stopPlayback(ctx);
              if (ctx.ui) {
                ctx.ui.notify("⏹️ Audio detenido", "info");
              }
            },
            () => {
              toggleRecording(ctx).catch(() => {});
            },
            () => {
              openVoiceMenu(ctx, "volume").catch(() => {});
            }
          );
        },
        { placement: "belowEditor" }
      );
    }
  };

  const openVoiceMenu = async (
    ctx: ExtensionContext,
    initialScreen: MenuScreen = "main"
  ): Promise<void> => {
    if (!ctx.hasUI || ctx.mode !== "tui") {
      ctx.ui.notify("El menú interactivo requiere modo TUI", "warning");
      return;
    }

    await ctx.ui.custom(
      (tui, theme, _kb, done) => {
        return new VoiceMenuComponent({
          configManager,
          player,
          theme,
          tui,
          ctx,
          lastAssistantText,
          initialScreen,
          onClose: done,
          onDictate: () => {
            toggleRecording(ctx).catch(() => {});
          },
          onConfigChanged: (newConfig) => {
            config = newConfig;
            registerAllShortcuts(ctx);
            updateUiState(ctx);
          },
        });
      },
      {
        overlay: true,
        overlayOptions: {
          anchor: "center",
          width: 98,
          maxHeight: 25,
        },
      }
    );
  };

  const speakText = async (
    rawText: string,
    ctx?: ExtensionContext,
    overrideVoice?: string
  ): Promise<void> => {
    if (!rawText || !rawText.trim()) {
      return;
    }

    const cleanText = TextSanitizer.sanitize(rawText, {
      filterCode: config.filterCode,
      maxChars: config.maxCharsPerSpeech,
    });

    if (!cleanText || !cleanText.trim()) {
      return;
    }

    const apiKey = configManager.getActiveApiKey();
    const effectiveConfig = overrideVoice
      ? {
          ...config,
          openai: { ...config.openai, voice: overrideVoice },
          kokoro: { ...config.kokoro, voice: overrideVoice },
          elevenlabs: { ...config.elevenlabs, voiceId: overrideVoice },
        }
      : config;

    let provider;
    try {
      provider = createTTSProvider(effectiveConfig, apiKey);
    } catch (err: any) {
      if (ctx?.ui) {
        ctx.ui.notify(`[Voice] Error de configuración: ${err.message}`, "error");
      }
      return;
    }

    // Abort prior stream if running
    if (currentAbortController) {
      currentAbortController.abort();
    }
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    let textToSpeak = cleanText;
    if (config.tldr && textToSpeak.length > 200) {
      if (ctx?.ui) {
        ctx.ui.setStatus("pi-voice", "⏳ Generando resumen TL;DR...");
      }
      try {
        textToSpeak = await TldrSummarizer.summarize(cleanText);
      } catch {
        textToSpeak = cleanText;
      }
    }

    const chunks = TextSanitizer.splitSentences(textToSpeak, 70);
    if (chunks.length === 0) return;

    try {
      // Pipeline: start synthesizing chunk 0
      let nextPromise: Promise<any> | null = provider.synthesize(chunks[0], signal);
      nextPromise.catch(() => {});

      for (let i = 0; i < chunks.length; i++) {
        if (signal.aborted || !nextPromise) break;

        isSynthesizing = true;
        updateUiState(ctx);
        if (ctx?.ui && i === 0) {
          ctx.ui.setStatus("pi-voice", "🔊 Sintetizando...");
        }

        let currentResult;
        try {
          currentResult = await nextPromise;
        } catch (err: any) {
          if (signal.aborted || err.name === "AbortError") {
            break;
          }
          throw err;
        }
        isSynthesizing = false;

        // Immediately start synthesizing chunk i + 1 while chunk i plays!
        if (i + 1 < chunks.length && !signal.aborted) {
          nextPromise = provider.synthesize(chunks[i + 1], signal);
          nextPromise.catch(() => {});
        } else {
          nextPromise = null;
        }

        if (signal.aborted) break;

        if (ctx?.ui) {
          ctx.ui.setStatus(
            "pi-voice",
            chunks.length > 1
              ? `🔊 Reproduciendo (${i + 1}/${chunks.length})...`
              : "🔊 Reproduciendo..."
          );
        }
        updateUiState(ctx);

        await player.play(currentResult.audioBuffer, currentResult.format);
      }
    } catch (err: any) {
      if (!signal.aborted && err.name !== "AbortError" && ctx?.ui) {
        ctx.ui.notify(`[Voice] Error de reproducción: ${err.message}`, "error");
      }
    } finally {
      if (!signal.aborted) {
        isSynthesizing = false;
        updateUiState(ctx);
      }
    }
  };

  // Helper to extract text from Pi assistant messages
  const extractText = (msg: any): string => {
    if (!msg) return "";
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.content)) {
      return msg.content
        .filter((part: any) => part.type === "text" && typeof part.text === "string")
        .map((part: any) => part.text)
        .join("\n");
    }
    return "";
  };

  // Session start
  pi.on("session_start", async (_event, ctx) => {
    config = configManager.load();
    player.setCustomCommand(config.playerCommand);
    player.setVolume(config.volume ?? 1.0);
    registerAllShortcuts(ctx);
    updateUiState(ctx);
  });

  // User input cancels ongoing speech immediately
  pi.on("input", async (_event, _ctx) => {
    stopPlayback();
  });

  // Session shutdown cleanup
  pi.on("session_shutdown", async () => {
    stopPlayback();
  });

  // Track active subagents and role sequences for conversational crew mode
  const activeSubagents = new Map<
    string,
    { role: string; name: string; voice: string; label?: string }
  >();
  let lastFinishedRole: string | null = null;

  // Track known tasks and orchestrator phases when executing directly without subagents
  const knownTodoTasks = new Map<
    number,
    { title: string; status: string; note?: string }
  >();
  let lastAnnouncedTodoPhase: string | null = null;

  pi.on("tool_execution_start", async (event: any, ctx: ExtensionContext) => {
    if (!config.subagents?.enabled) return;

    // 1. Subagent tool execution start
    if (
      event.toolName === "subagent_run" ||
      event.toolName === "Agent" ||
      event.toolName === "subagent_continue"
    ) {
      const agentName = String(event.args?.agent || event.args?.name || "");
      const { role, name, voice } = resolveSubagentVoice(agentName, config);
      const rawLabel =
        event.args?.label ||
        (event.args?.task ? String(event.args.task).slice(0, 80) : undefined);
      const label = rawLabel
        ? TldrSummarizer.quickTranslateCommonEnglish(rawLabel)
        : undefined;

      activeSubagents.set(event.toolCallId, { role, name, voice, label });

      if (config.subagents.announceStart) {
        let msg: string;
        if (config.subagents.crewMode) {
          if (role === "Exploradora") {
            msg = label
              ? `A la orden, Gentleman. Jefe, me pongo a explorar: ${label}.`
              : "A la orden, Gentleman. Jefe, me pongo a explorar el terreno.";
          } else if (role === "Programador") {
            if (lastFinishedRole === "Exploradora") {
              msg = label
                ? `Recibido Dora, tomo la posta. Jefe, arranco a programar: ${label}.`
                : "Recibido Dora, tomo la posta. Jefe, arranco con la implementación.";
            } else {
              msg = label
                ? `A la orden, Jefe. Me pongo a programar: ${label}.`
                : "A la orden, Jefe. Me pongo a codear.";
            }
          } else if (role === "Auditor") {
            if (lastFinishedRole === "Programador") {
              msg = label
                ? `A ver qué hiciste, Alex... Jefe, voy a auditar con lupa: ${label}.`
                : "A ver qué hiciste, Alex... Jefe, voy a auditar y correr las pruebas.";
            } else {
              msg = label
                ? `Jefe, entro a auditar y verificar: ${label}.`
                : "Jefe, entro a auditar.";
            }
          } else {
            msg = label ? `Jefe, inicio tarea: ${label}.` : "Jefe, inicio tarea.";
          }
        } else {
          msg = label ? `${role} iniciado: ${label}.` : `${role} iniciado.`;
        }

        speakText(msg, ctx, voice).catch(() => {});
      }
      return;
    }

    // 2. Orchestrator Direct Phases (Todo tool transitions)
    if (
      event.toolName === "todo" &&
      config.subagents?.announceOrchestratorPhases !== false
    ) {
      const args = event.args || {};
      const action = String(args.action || "");
      const orchVoice =
        config.subagents?.orchestrator || config.kokoro?.voice || "dora_heart";

      if (action === "write" && Array.isArray(args.tasks)) {
        knownTodoTasks.clear();
        args.tasks.forEach((t: any, idx: number) => {
          const id = typeof t.id === "number" ? t.id : idx + 1;
          knownTodoTasks.set(id, {
            title: t.title || `Fase ${id}`,
            status: t.status || "pending",
            note: t.note,
          });
        });

        if (args.tasks.length > 0) {
          const count = args.tasks.length;
          const msg = config.subagents?.crewMode
            ? `Jefe, planifiqué el trabajo en ${count} ${count === 1 ? "fase" : "fases"}. Pongo manos a la obra.`
            : `Trabajo planificado en ${count} ${count === 1 ? "fase" : "fases"}.`;
          speakText(msg, ctx, orchVoice).catch(() => {});
        }
      } else if (action === "update" && typeof args.id === "number") {
        const existing = knownTodoTasks.get(args.id);
        const title = args.title || existing?.title || args.note || `Fase ${args.id}`;
        const newStatus = args.status || existing?.status;
        const note = args.note || existing?.note;

        knownTodoTasks.set(args.id, {
          title,
          status: newStatus,
          note,
        });

        const cleanTitle = cleanPhaseTitle(args.note || title);

        if (newStatus === "in_progress") {
          const phraseKey = `start:${args.id}:${cleanTitle}`;
          if (lastAnnouncedTodoPhase !== phraseKey) {
            lastAnnouncedTodoPhase = phraseKey;
            const msg = config.subagents?.crewMode
              ? `Jefe, arranco la fase: ${cleanTitle}.`
              : `Iniciando fase: ${cleanTitle}.`;
            speakText(msg, ctx, orchVoice).catch(() => {});
          }
        } else if (newStatus === "done") {
          const phraseKey = `done:${args.id}:${cleanTitle}`;
          if (lastAnnouncedTodoPhase !== phraseKey) {
            lastAnnouncedTodoPhase = phraseKey;
            const msg = config.subagents?.crewMode
              ? `Jefe, quedó lista la fase: ${cleanTitle}.`
              : `Fase completada: ${cleanTitle}.`;
            speakText(msg, ctx, orchVoice).catch(() => {});
          }
        }
      } else if (action === "add" && args.title) {
        const cleanTitle = cleanPhaseTitle(args.title);
        if (args.status === "in_progress") {
          const msg = config.subagents?.crewMode
            ? `Jefe, arranco la fase: ${cleanTitle}.`
            : `Iniciando fase: ${cleanTitle}.`;
          speakText(msg, ctx, orchVoice).catch(() => {});
        }
      }
      return;
    }

    // 3. Orchestrator Direct Verification announcements (Test runs)
    if (
      event.toolName === "bash" &&
      config.subagents?.announceOrchestratorPhases !== false
    ) {
      const cmd = String(event.args?.command || "").trim();
      const isTestCmd = /\b(npm\s+test|node\s+--test|pytest|cargo\s+test|go\s+test)\b/i.test(cmd);
      if (isTestCmd) {
        const orchVoice =
          config.subagents?.orchestrator || config.kokoro?.voice || "dora_heart";
        const msg = config.subagents?.crewMode
          ? "Jefe, voy a correr las pruebas de verificación."
          : "Ejecutando pruebas de verificación.";
        speakText(msg, ctx, orchVoice).catch(() => {});
      }
    }
  });

  pi.on("tool_execution_end", async (event: any, ctx: ExtensionContext) => {
    if (!config.subagents?.enabled) return;

    // Direct Verification conclusion
    if (
      event.toolName === "bash" &&
      config.subagents?.announceOrchestratorPhases !== false
    ) {
      const cmd = String(event.args?.command || "").trim();
      const isTestCmd = /\b(npm\s+test|node\s+--test|pytest|cargo\s+test|go\s+test)\b/i.test(cmd);
      if (isTestCmd) {
        const orchVoice =
          config.subagents?.orchestrator || config.kokoro?.voice || "dora_heart";
        const msg = event.isError
          ? config.subagents?.crewMode
            ? "Jefe, atención: las pruebas fallaron."
            : "Las pruebas fallaron."
          : config.subagents?.crewMode
            ? "Jefe, pruebas verificadas y pasadas con éxito."
            : "Pruebas pasadas exitosamente.";
        speakText(msg, ctx, orchVoice).catch(() => {});
        return;
      }
    }

    const tracked = activeSubagents.get(event.toolCallId);
    if (!tracked) return;
    activeSubagents.delete(event.toolCallId);
    lastFinishedRole = tracked.role;

    if (config.subagents.announceEnd) {
      if (event.isError) {
        const errorMsg = config.subagents.crewMode
          ? `Jefe, ${tracked.name} tuvo un problema: la tarea finalizó con error.`
          : `${tracked.role} finalizó con error.`;
        speakText(errorMsg, ctx, tracked.voice).catch(() => {});
      } else {
        const rawResult = extractTextFromResult(event.result);
        if (rawResult && rawResult.trim()) {
          try {
            const summary = await TldrSummarizer.summarize(rawResult, {
              role: tracked.role,
              crewMode: config.subagents.crewMode,
            });

            let finalMsg: string;
            if (config.subagents.crewMode) {
              if (tracked.role === "Exploradora") {
                finalMsg = `${summary} Alex, te dejo la cancha lista.`;
              } else if (tracked.role === "Programador") {
                finalMsg = `${summary} Santa, pasale la lupa y fijate si no rompí nada.`;
              } else if (tracked.role === "Auditor") {
                finalMsg = `${summary} Gentleman, todo verificado y aprobado para el Jefe.`;
              } else {
                finalMsg = `${summary}`;
              }
            } else {
              finalMsg = `${tracked.role} completado: ${summary}`;
            }

            speakText(finalMsg, ctx, tracked.voice).catch(() => {});
          } catch {
            const fallbackMsg = config.subagents.crewMode
              ? `Jefe, ${tracked.name} terminó su tarea exitosamente.`
              : `${tracked.role} completó su tarea.`;
            speakText(fallbackMsg, ctx, tracked.voice).catch(() => {});
          }
        } else {
          const fallbackMsg = config.subagents.crewMode
            ? `Jefe, ${tracked.name} completó la tarea.`
            : `${tracked.role} completó su tarea.`;
          speakText(fallbackMsg, ctx, tracked.voice).catch(() => {});
        }
      }
    }
  });
  // Agent finishes response
  pi.on("agent_end", async (event, ctx) => {
    const assistantMessages = (event.messages || []).filter(
      (m: any) => m.role === "assistant"
    );

    if (assistantMessages.length > 0) {
      const lastMsg = assistantMessages[assistantMessages.length - 1];
      const text = extractText(lastMsg);
      if (text.trim()) {
        lastAssistantText = text;

        if (config.enabled && config.autoRead) {
          speakText(text, ctx).catch(() => {});
        }
      }
    }
  });

  // Register shortcuts dynamically based on configuration
  const registerAllShortcuts = (ctx?: ExtensionContext) => {
    if (typeof (pi as any).registerShortcut !== "function") return;

    const sc = config.shortcuts || {
      menu: "alt+v",
      stop: "alt+s",
      record: "alt+r",
      volumeUp: "alt+up",
      volumeDown: "alt+down",
    };

    if (sc.menu) {
      (pi as any).registerShortcut(sc.menu, {
        description: "Abrir menú interactivo de Pi Voice",
        handler: async (c: ExtensionContext) => {
          await openVoiceMenu(c);
        },
      });
    }

    if (sc.stop) {
      (pi as any).registerShortcut(sc.stop, {
        description: "Detener reproducción de voz inmediatamente",
        handler: async (c: ExtensionContext) => {
          stopPlayback(c);
          if (c.ui) {
            c.ui.notify("⏹️ Audio detenido", "info");
          }
        },
      });
    }

    if (sc.record) {
      (pi as any).registerShortcut(sc.record, {
        description: "Alternar grabación de voz para dictado de prompts",
        handler: async (c: ExtensionContext) => {
          await toggleRecording(c);
        },
      });
    }

    if (sc.volumeUp) {
      (pi as any).registerShortcut(sc.volumeUp, {
        description: "Subir volumen de voz (+10%)",
        handler: async (c: ExtensionContext) => {
          const current = config.volume ?? 1.0;
          const next = Math.min(1.5, Math.round((current + 0.1) * 10) / 10);
          config = configManager.save({ volume: next });
          player.setVolume(next);
          if (c.ui) {
            c.ui.notify(`🔊 Volumen: ${Math.round(next * 100)}%`, "info");
          }
          updateUiState(c);
        },
      });
    }

    if (sc.volumeDown) {
      (pi as any).registerShortcut(sc.volumeDown, {
        description: "Bajar volumen de voz (-10%)",
        handler: async (c: ExtensionContext) => {
          const current = config.volume ?? 1.0;
          const next = Math.max(0.0, Math.round((current - 0.1) * 10) / 10);
          config = configManager.save({ volume: next });
          player.setVolume(next);
          if (c.ui) {
            c.ui.notify(`🔉 Volumen: ${Math.round(next * 100)}%`, "info");
          }
          updateUiState(c);
        },
      });
    }
  };

  registerAllShortcuts();

  // Register command /voice
  pi.registerCommand("voice", {
    description: "Control de síntesis de voz (/voice menu para interfaz visual)",
    handler: async (args, ctx) => {
      const parts = (args || "").trim().split(/\s+/);
      const sub = parts[0]?.toLowerCase() || "";
      const val = parts.slice(1).join(" ");

      switch (sub) {
        case "":
        case "menu":
        case "gui": {
          await openVoiceMenu(ctx);
          break;
        }

        case "crew":
        case "cuadrilla":
        case "jefe": {
          const current = config.subagents?.crewMode ?? true;
          const next =
            val.toLowerCase() === "on" ? true : val.toLowerCase() === "off" ? false : !current;
          config = configManager.updateNested("subagents", { crewMode: next });
          updateUiState(ctx);
          ctx.ui.notify(
            next
              ? "🔊 Modo Cuadrilla ('Jefe') ACTIVADO"
              : "🔇 Modo Cuadrilla ('Jefe') DESACTIVADO",
            "info"
          );
          break;
        }

        case "agents":
        case "subagents": {
          const next =
            val.toLowerCase() === "on"
              ? true
              : val.toLowerCase() === "off"
              ? false
              : !config.subagents.enabled;
          config = configManager.updateNested("subagents", { enabled: next });
          updateUiState(ctx);
          ctx.ui.notify(
            next
              ? "🔊 Voces diferenciadas para subagentes ACTIVADAS"
              : "🔇 Voces diferenciadas para subagentes DESACTIVADAS",
            "info"
          );
          break;
        }

        case "phases":
        case "fases": {
          const current = config.subagents?.announceOrchestratorPhases ?? true;
          const next =
            val.toLowerCase() === "on" ? true : val.toLowerCase() === "off" ? false : !current;
          config = configManager.updateNested("subagents", { announceOrchestratorPhases: next });
          updateUiState(ctx);
          ctx.ui.notify(
            next
              ? "🔊 Locución de fases del orquestador ACTIVADA"
              : "🔇 Locución de fases del orquestador DESACTIVADA",
            "info"
          );
          break;
        }

        case "tldr":
        case "resumen": {
          const nextState = !config.tldr;
          config = configManager.save({ tldr: nextState });
          updateUiState(ctx);
          ctx.ui.notify(
            nextState
              ? "🔊 Modo Resumen TL;DR ACTIVADO (hablará en síntesis breve)"
              : "🔊 Modo Resumen TL;DR DESACTIVADO (hablará respuesta completa)",
            "info"
          );
          break;
        }

        case "on": {
          config = configManager.save({ autoRead: true });
          updateUiState(ctx);
          ctx.ui.notify("🔊 Lectura en voz automática ACTIVADA", "info");
          break;
        }

        case "off": {
          config = configManager.save({ autoRead: false });
          player.stop();
          updateUiState(ctx);
          ctx.ui.notify("🔇 Lectura en voz automática DESACTIVADA", "info");
          break;
        }

        case "toggle": {
          const newState = !config.autoRead;
          config = configManager.save({ autoRead: newState });
          if (!newState) player.stop();
          updateUiState(ctx);
          ctx.ui.notify(
            newState ? "🔊 Lectura automática ACTIVADA" : "🔇 Lectura automática DESACTIVADA",
            "info"
          );
          break;
        }

        case "stop": {
          stopPlayback(ctx);
          ctx.ui.notify("⏹️ Reproducción de voz detenida", "info");
          break;
        }

        case "read":
        case "replay": {
          if (!lastAssistantText) {
            ctx.ui.notify("No hay ninguna respuesta previa para leer.", "warning");
            return;
          }
          ctx.ui.notify("🔊 Leyendo última respuesta...", "info");
          speakText(lastAssistantText, ctx).catch(() => {});
          break;
        }

        case "record":
        case "mic":
        case "dictar": {
          await toggleRecording(ctx);
          break;
        }

        case "test": {
          const testPhrase =
            val || "¡Hola! El sistema de voz de Pi CLI está configurado y funcionando correctamente.";
          ctx.ui.notify(`🔊 Reproduciendo prueba con ${config.provider}...`, "info");
          speakText(testPhrase, ctx).catch(() => {});
          break;
        }

        case "provider": {
          if (!val || !["openai", "elevenlabs", "kokoro", "custom"].includes(val.toLowerCase())) {
            ctx.ui.notify(
              `Proveedor actual: ${config.provider}. Opciones válidas: kokoro, openai, elevenlabs, custom`,
              "warning"
            );
            return;
          }
          config = configManager.save({ provider: val.toLowerCase() as SpeechProviderType });
          updateUiState(ctx);
          ctx.ui.notify(`Proveedor de voz cambiado a: ${config.provider}`, "info");
          break;
        }

        case "voice": {
          if (!val) {
            const currentVoice =
              config.provider === "openai"
                ? config.openai.voice
                : config.provider === "kokoro"
                ? config.kokoro.voice
                : config.elevenlabs.voiceId;
            ctx.ui.notify(`Voz actual: ${currentVoice}`, "info");
            return;
          }
          if (config.provider === "openai") {
            config = configManager.updateNested("openai", { voice: val });
            ctx.ui.notify(`Voz OpenAI cambiada a: ${val}`, "info");
          } else if (config.provider === "kokoro") {
            config = configManager.updateNested("kokoro", { voice: val });
            ctx.ui.notify(`Voz Kokoro cambiada a: ${val}`, "info");
          } else if (config.provider === "elevenlabs") {
            config = configManager.updateNested("elevenlabs", { voiceId: val });
            ctx.ui.notify(`Voice ID ElevenLabs cambiado a: ${val}`, "info");
          }
          updateUiState(ctx);
          break;
        }

        case "custom": {
          const subParts = val.split(/\s+/);
          const customAction = subParts[0]?.toLowerCase();
          const customVal = subParts.slice(1).join(" ");

          if (customAction === "url" && customVal) {
            config = configManager.updateNested("custom", { url: customVal });
            updateUiState(ctx);
            ctx.ui.notify(`URL Custom actualizada a: ${customVal}`, "info");
          } else if (customAction === "method" && (customVal === "POST" || customVal === "GET")) {
            config = configManager.updateNested("custom", { method: customVal as "POST" | "GET" });
            updateUiState(ctx);
            ctx.ui.notify(`Método Custom actualizado a: ${customVal}`, "info");
          } else if (customAction === "format" && (customVal === "wav" || customVal === "mp3")) {
            config = configManager.updateNested("custom", { format: customVal as "wav" | "mp3" });
            updateUiState(ctx);
            ctx.ui.notify(`Formato Custom actualizado a: ${customVal}`, "info");
          } else if (customAction === "activate") {
            config = configManager.save({ provider: "custom" });
            updateUiState(ctx);
            ctx.ui.notify("Custom API seleccionada como proveedor activo", "info");
          } else {
            ctx.ui.notify(
              "Uso de /voice custom: url <url> | method <POST|GET> | format <wav|mp3> | activate",
              "info"
            );
          }
          break;
        }

        case "shortcuts":
        case "shortcut":
        case "keybinding": {
          const sc = config.shortcuts || {
            menu: "alt+v",
            stop: "alt+s",
            record: "alt+r",
            volumeUp: "alt+up",
            volumeDown: "alt+down",
          };
          const subParts = val.trim().split(/\s+/);
          const targetAction = subParts[0]?.toLowerCase();
          const targetKey = subParts[1]?.toLowerCase();

          if (!targetAction) {
            const list = [
              "Atajos de teclado configurados:",
              `  menu:       ${sc.menu}`,
              `  stop:       ${sc.stop}`,
              `  record:     ${sc.record}`,
              `  volumeUp:   ${sc.volumeUp}`,
              `  volumeDown: ${sc.volumeDown}`,
              "",
              "Para cambiar uno: /voice shortcut <accion> <tecla> (ej: /voice shortcut record f8)",
            ].join("\n");
            if (ctx.ui.editor) {
              await ctx.ui.editor("Atajos de Voz", list);
            } else {
              ctx.ui.notify(list, "info");
            }
            return;
          }

          if (
            ["menu", "stop", "record", "volumeup", "volumedown"].includes(targetAction) &&
            targetKey
          ) {
            const normalizedAction =
              targetAction === "volumeup"
                ? "volumeUp"
                : targetAction === "volumedown"
                ? "volumeDown"
                : targetAction;
            config = configManager.updateNested("shortcuts", { [normalizedAction]: targetKey });
            registerAllShortcuts(ctx);
            ctx.ui.notify(`Atajo para ${normalizedAction} actualizado a: ${targetKey}`, "info");
          } else {
            ctx.ui.notify(
              "Uso: /voice shortcut <menu|stop|record|volumeUp|volumeDown> <tecla>",
              "warning"
            );
          }
          break;
        }

        case "speed": {
          const num = parseFloat(val);
          if (isNaN(num) || num < 0.25 || num > 4.0) {
            ctx.ui.notify("Velocidad inválida. Debe ser un número entre 0.25 y 4.0", "error");
            return;
          }
          config = configManager.updateNested("openai", { speed: num });
          ctx.ui.notify(`Velocidad ajustada a: ${num}x`, "info");
          break;
        }

        case "vol":
        case "volume": {
          if (!val) {
            const currentVol = Math.round((config.volume ?? 1.0) * 100);
            ctx.ui.notify(`Volumen actual: ${currentVol}%`, "info");
            return;
          }
          const num = parseFloat(val);
          if (isNaN(num) || num < 0 || num > 150) {
            ctx.ui.notify("Volumen inválido. Debe ser un número entre 0 y 150 (porcentaje)", "error");
            return;
          }
          const volFraction = num <= 1.5 && val.includes(".") ? num : num / 100;
          config = configManager.save({ volume: Math.max(0, Math.min(1.5, volFraction)) });
          player.setVolume(config.volume);
          updateUiState(ctx);
          ctx.ui.notify(`Volumen establecido en ${Math.round(config.volume * 100)}%`, "info");
          break;
        }

        case "filter": {
          const mode = val.toLowerCase();
          if (!["omit", "mention", "raw"].includes(mode)) {
            ctx.ui.notify("Modo inválido. Opciones: omit, mention, raw", "error");
            return;
          }
          config = configManager.save({ filterCode: mode as CodeFilterMode });
          ctx.ui.notify(`Filtro de código cambiado a: ${mode}`, "info");
          break;
        }

        case "key": {
          const cleanedKey = ConfigManager.cleanApiKey(val);
          if (!cleanedKey) {
            ctx.ui.notify("Uso: /voice key <tu-api-key> (sin los signos < >)", "warning");
            return;
          }
          if (config.provider === "openai") {
            config = configManager.updateNested("openai", { apiKey: cleanedKey });
            ctx.ui.notify("Clave de OpenAI guardada y sanitizada en voice.json", "info");
          } else if (config.provider === "elevenlabs") {
            config = configManager.updateNested("elevenlabs", { apiKey: cleanedKey });
            ctx.ui.notify("Clave de ElevenLabs guardada y sanitizada en voice.json", "info");
          }
          break;
        }

        case "status": {
          const detected = player.detectPlayer() || "ninguno";
          const apiKeySet = Boolean(configManager.getActiveApiKey());
          const info = [
            `Estado auto-lectura: ${config.autoRead ? "ACTIVADO" : "DESACTIVADO"}`,
            `Proveedor activo: ${config.provider}`,
            `API Key detectada: ${apiKeySet ? "Sí (configurada)" : "No configurada"}`,
            `Voz actual: ${config.provider === "openai" ? config.openai.voice : config.elevenlabs.voiceId}`,
            `Velocidad: ${config.openai.speed}x`,
            `Volumen: ${Math.round((config.volume ?? 1.0) * 100)}%`,
            `Filtro de código: ${config.filterCode}`,
            `Reproductor de audio CLI: ${detected}`,
            `Archivo de configuración: ${configManager.getConfigPath()}`,
          ].join("\n");

          if (ctx.ui.editor) {
            await ctx.ui.editor("Estado de Pi Voice", info);
          } else {
            ctx.ui.notify(`[Voice] ${config.provider} | ${config.autoRead ? "ON" : "OFF"} | player: ${detected}`, "info");
          }
          break;
        }

        case "help":
        default: {
          const helpText = [
            "Comandos de Pi Voice:",
            "  /voice                 - Abre el menú visual interactivo con mouse",
            "  /voice menu            - Abre el menú visual interactivo con mouse",
            "  /voice agents [on|off] - Alterna las voces diferenciadas para subagentes",
            "  /voice phases [on|off] - Alterna la locución de fases del orquestador",
            "  /voice crew [on|off]   - Alterna el modo conversacional de cuadrilla ('Jefe')",
            "  /voice record          - Inicia o detiene el dictado de prompts por voz (Alt+R)",
            "  /voice tldr            - Alterna el modo de resumen breve ejecutivo (TL;DR)",
            "  /voice on              - Activa la lectura automática tras cada respuesta",
            "  /voice off             - Desactiva la lectura automática",
            "  /voice toggle          - Alterna entre lectura automática on/off",
            "  /voice read            - Lee en voz alta la última respuesta generada",
            "  /voice stop            - Detiene la reproducción de voz actual",
            "  /voice test [texto]    - Prueba el sintetizador con una frase",
            "  /voice status          - Muestra la configuración actual",
            "  /voice provider <tipo> - Cambia de proveedor (openai | elevenlabs | custom)",
            "  /voice voice <nombre>  - Cambia la voz (ej: nova, alloy, echo, onyx)",
            "  /voice volume <0-150>  - Ajusta el volumen de habla (ej: 80, 100)",
            "  /voice custom <accion> - Configura API custom (url, method, format, activate)",
            "  /voice speed <numero>  - Cambia la velocidad (ej: 1.0, 1.25)",
            "  /voice filter <modo>   - Modo de código (omit | mention | raw)",
            "  /voice key <api-key>   - Guarda la API key del proveedor activo",
          ].join("\n");

          if (ctx.ui.editor) {
            await ctx.ui.editor("Ayuda de Pi Voice", helpText);
          } else {
            ctx.ui.notify(helpText, "info");
          }
          break;
        }
      }
    },
  });
}
