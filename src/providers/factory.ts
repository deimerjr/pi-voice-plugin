import type { VoicePluginConfig } from "../config.ts";
import type { TTSProvider } from "./base.ts";
import { OpenAIProvider } from "./openai.ts";
import { ElevenLabsProvider } from "./elevenlabs.ts";
import { CustomHttpProvider } from "./custom.ts";

export function createTTSProvider(
  config: VoicePluginConfig,
  resolvedApiKey?: string
): TTSProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(config.openai, resolvedApiKey);
    case "elevenlabs":
      return new ElevenLabsProvider(config.elevenlabs, resolvedApiKey);
    case "custom":
      return new CustomHttpProvider(config.custom);
    default:
      throw new Error(`Proveedor desconocido: ${config.provider}`);
  }
}
