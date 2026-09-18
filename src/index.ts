import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { ConfigManager, type VoicePluginConfig, type CodeFilterMode, type SpeechProviderType } from "./config.ts";
import { TextSanitizer } from "./sanitizer.ts";
import { createTTSProvider } from "./providers/factory.ts";
import { AudioPlayer } from "./player.ts";

export default function (pi: ExtensionAPI) {
  const configManager = new ConfigManager();
  let config: VoicePluginConfig = configManager.getConfig();

  const player = new AudioPlayer({
    customCommand: config.playerCommand,
  });

  let lastAssistantText = "";
  let isSynthesizing = false;

  const updateFooterStatus = (ctx?: ExtensionContext) => {
    if (!ctx?.ui) return;
    const status = config.autoRead ? "🔊 ON" : "🔇 OFF";
    const providerLabel = config.provider === "openai" ? config.openai.voice : config.provider;
    ctx.ui.setStatus("pi-voice", `Voice: ${status} (${providerLabel})`);
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
      updateFooterStatus(ctx);
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
    updateFooterStatus(ctx);
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
          // Speak in background
          speakText(text, ctx).catch(() => {});
        }
      }
    }
  });

  // Register command /voice
  pi.registerCommand("voice", {
    description: "Control de síntesis de voz (/voice help para opciones)",
    handler: async (args, ctx) => {
      const parts = (args || "").trim().split(/\s+/);
      const sub = parts[0]?.toLowerCase() || "";
      const val = parts.slice(1).join(" ");

      switch (sub) {
        case "on": {
          config = configManager.save({ autoRead: true });
          updateFooterStatus(ctx);
          ctx.ui.notify("🔊 Lectura en voz automática ACTIVADA", "info");
          break;
        }

        case "off": {
          config = configManager.save({ autoRead: false });
          player.stop();
          updateFooterStatus(ctx);
          ctx.ui.notify("🔇 Lectura en voz automática DESACTIVADA", "info");
          break;
        }

        case "toggle": {
          const newState = !config.autoRead;
          config = configManager.save({ autoRead: newState });
          if (!newState) player.stop();
          updateFooterStatus(ctx);
          ctx.ui.notify(
            newState ? "🔊 Lectura automática ACTIVADA" : "🔇 Lectura automática DESACTIVADA",
            "info"
          );
          break;
        }

        case "stop": {
          player.stop();
          isSynthesizing = false;
          updateFooterStatus(ctx);
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
          if (!val || !["openai", "elevenlabs", "custom"].includes(val.toLowerCase())) {
            ctx.ui.notify(
              `Proveedor actual: ${config.provider}. Opciones válidas: openai, elevenlabs, custom`,
              "warning"
            );
            return;
          }
          config = configManager.save({ provider: val.toLowerCase() as SpeechProviderType });
          updateFooterStatus(ctx);
          ctx.ui.notify(`Proveedor de voz cambiado a: ${config.provider}`, "info");
          break;
        }

        case "voice": {
          if (!val) {
            const currentVoice =
              config.provider === "openai" ? config.openai.voice : config.elevenlabs.voiceId;
            ctx.ui.notify(`Voz actual: ${currentVoice}`, "info");
            return;
          }
          if (config.provider === "openai") {
            config = configManager.updateNested("openai", { voice: val });
            ctx.ui.notify(`Voz OpenAI cambiada a: ${val}`, "info");
          } else if (config.provider === "elevenlabs") {
            config = configManager.updateNested("elevenlabs", { voiceId: val });
            ctx.ui.notify(`Voice ID ElevenLabs cambiado a: ${val}`, "info");
          }
          updateFooterStatus(ctx);
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
            "  /voice on              - Activa la lectura automática tras cada respuesta",
            "  /voice off             - Desactiva la lectura automática",
            "  /voice toggle          - Alterna entre lectura automática on/off",
            "  /voice read            - Lee en voz alta la última respuesta generada",
            "  /voice stop            - Detiene la reproducción de voz actual",
            "  /voice test [texto]    - Prueba el sintetizador con una frase",
            "  /voice status          - Muestra la configuración actual",
            "  /voice provider <tipo> - Cambia de proveedor (openai | elevenlabs | custom)",
            "  /voice voice <nombre>  - Cambia la voz (ej: nova, alloy, echo, onyx)",
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
