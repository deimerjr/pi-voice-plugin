import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  ConfigManager,
  type VoicePluginConfig,
  type CodeFilterMode,
  type SpeechProviderType,
} from "./config.ts";
import { TextSanitizer } from "./sanitizer.ts";
import { createTTSProvider } from "./providers/factory.ts";
import { AudioPlayer } from "./player.ts";
import { VoiceMenuComponent } from "./menu.ts";

export default function (pi: ExtensionAPI) {
  const configManager = new ConfigManager();
  let config: VoicePluginConfig = configManager.getConfig();

  const player = new AudioPlayer({
    customCommand: config.playerCommand,
  });

  let lastAssistantText = "";
  let isSynthesizing = false;

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

    // 1. Footer status (visible in the bottom bar)
    ctx.ui.setStatus(
      "pi-voice",
      `Voice: ${statusIcon} ${config.autoRead ? "ON" : "OFF"} (${providerLabel})`
    );

    // 2. Clear any widget below editor
    if (ctx.hasUI) {
      ctx.ui.setWidget("pi-voice-pill", undefined);
    }
  };

  const openVoiceMenu = async (ctx: ExtensionContext): Promise<void> => {
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
          onClose: done,
          onConfigChanged: (newConfig) => {
            config = newConfig;
            updateUiState(ctx);
          },
        });
      },
      {
        overlay: true,
        overlayOptions: {
          anchor: "center",
          width: 72,
          maxHeight: 22,
        },
      }
    );
  };

  const speakText = async (rawText: string, ctx?: ExtensionContext): Promise<void> => {
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
    let provider;
    try {
      provider = createTTSProvider(config, apiKey);
    } catch (err: any) {
      if (ctx?.ui) {
        ctx.ui.notify(`[Voice] Error de configuración: ${err.message}`, "error");
      }
      return;
    }

    isSynthesizing = true;
    if (ctx?.ui) {
      ctx.ui.setStatus("pi-voice", "🔊 Sintetizando...");
    }

    try {
      const result = await provider.synthesize(cleanText);
      isSynthesizing = false;

      if (ctx?.ui) {
        ctx.ui.setStatus("pi-voice", "🔊 Reproduciendo...");
      }

      await player.play(result.audioBuffer, result.format);
    } catch (err: any) {
      if (ctx?.ui) {
        ctx.ui.notify(`[Voice] Error de reproducción: ${err.message}`, "error");
      }
    } finally {
      isSynthesizing = false;
      updateUiState(ctx);
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
    updateUiState(ctx);
  });

  // User input cancels ongoing speech immediately
  pi.on("input", async (_event, _ctx) => {
    if (player.isPlaying() || isSynthesizing) {
      player.stop();
      isSynthesizing = false;
    }
  });

  // Session shutdown cleanup
  pi.on("session_shutdown", async () => {
    player.stop();
    isSynthesizing = false;
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

  // Register shortcut to open voice menu directly (if supported by host)
  if (typeof (pi as any).registerShortcut === "function") {
    (pi as any).registerShortcut("ctrl+alt+v", {
      description: "Abrir menú interactivo de Pi Voice",
      handler: async (ctx: ExtensionContext) => {
        await openVoiceMenu(ctx);
      },
    });
  }

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
          player.stop();
          isSynthesizing = false;
          updateUiState(ctx);
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
            "  /voice on              - Activa la lectura automática tras cada respuesta",
            "  /voice off             - Desactiva la lectura automática",
            "  /voice toggle          - Alterna entre lectura automática on/off",
            "  /voice read            - Lee en voz alta la última respuesta generada",
            "  /voice stop            - Detiene la reproducción de voz actual",
            "  /voice test [texto]    - Prueba el sintetizador con una frase",
            "  /voice status          - Muestra la configuración actual",
            "  /voice provider <tipo> - Cambia de proveedor (openai | elevenlabs | custom)",
            "  /voice voice <nombre>  - Cambia la voz (ej: nova, alloy, echo, onyx)",
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
