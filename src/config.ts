import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export type SpeechProviderType = "openai" | "elevenlabs" | "kokoro" | "custom";
export type CodeFilterMode = "omit" | "mention" | "raw";
export type SpeechMode = "final" | "all";

export interface OpenAIProviderConfig {
  apiKey?: string;
  baseUrl: string;
  model: string;
  voice: string;
  speed: number;
  format: "wav" | "mp3" | "opus" | "aac" | "flac";
}

export interface ElevenLabsProviderConfig {
  apiKey?: string;
  baseUrl: string;
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
}

export interface KokoroProviderConfig {
  baseUrl: string;
  model: string;
  voice: string;
  speed: number;
  format: "wav" | "mp3";
}

export interface CustomProviderConfig {
  url: string;
  method: "POST" | "GET";
  headers?: Record<string, string>;
  bodyTemplate?: string;
  format: "wav" | "mp3";
}

export interface VoicePluginConfig {
  enabled: boolean;
  autoRead: boolean;
  mode: SpeechMode;
  filterCode: CodeFilterMode;
  provider: SpeechProviderType;
  maxCharsPerSpeech: number;
  playerCommand?: string;
  volume: number;
  openai: OpenAIProviderConfig;
  elevenlabs: ElevenLabsProviderConfig;
  kokoro: KokoroProviderConfig;
  custom: CustomProviderConfig;
}

export const DEFAULT_CONFIG: VoicePluginConfig = {
  enabled: true,
  autoRead: false,
  mode: "final",
  filterCode: "omit",
  provider: "openai",
  maxCharsPerSpeech: 4000,
  volume: 1.0,
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "tts-1",
    voice: "nova",
    speed: 1.0,
    format: "wav",
  },
  elevenlabs: {
    baseUrl: "https://api.elevenlabs.io/v1",
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel
    modelId: "eleven_multilingual_v2",
    stability: 0.5,
    similarityBoost: 0.75,
  },
  kokoro: {
    baseUrl: "http://127.0.0.1:8880/v1",
    model: "tts-1",
    voice: "ef_dora",
    speed: 1.0,
    format: "wav",
  },
  custom: {
    url: "http://localhost:8000/v1/audio/speech",
    method: "POST",
    format: "wav",
    headers: {
      "Content-Type": "application/json",
    },
  },
};

export class ConfigManager {
  private configPath: string;
  private currentConfig: VoicePluginConfig;

  constructor(customPath?: string) {
    this.configPath =
      customPath ||
      process.env.PI_VOICE_CONFIG_PATH ||
      path.join(os.homedir(), ".pi", "agent", "voice.json");
    this.currentConfig = this.load();
  }

  public getConfigPath(): string {
    return this.configPath;
  }

  public getConfig(): VoicePluginConfig {
    return { ...this.currentConfig };
  }

  public static cleanApiKey(key?: string): string | undefined {
    if (!key || typeof key !== "string") return undefined;
    const trimmed = key.trim();
    const cleaned = trimmed
      .replace(/^<+|>+$/g, "")
      .replace(/^["']+|["']+$/g, "")
      .trim();
    return cleaned || undefined;
  }

  public getActiveApiKey(): string | undefined {
    const provider = this.currentConfig.provider;
    let rawKey: string | undefined;
    if (provider === "openai") {
      rawKey =
        this.currentConfig.openai.apiKey ||
        process.env.OPENAI_API_KEY ||
        process.env.OPENAI_TTS_API_KEY;
    } else if (provider === "elevenlabs") {
      rawKey =
        this.currentConfig.elevenlabs.apiKey ||
        process.env.ELEVENLABS_API_KEY ||
        process.env.XI_API_KEY;
    }
    return ConfigManager.cleanApiKey(rawKey);
  }

  public load(): VoicePluginConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, "utf-8");
        const parsed = JSON.parse(raw);
        this.currentConfig = this.mergeConfig(DEFAULT_CONFIG, parsed);
        return this.currentConfig;
      }
    } catch {
      // Fallback to default on parse error
    }
    this.currentConfig = { ...DEFAULT_CONFIG };
    return this.currentConfig;
  }

  public save(updates: Partial<VoicePluginConfig>): VoicePluginConfig {
    this.currentConfig = this.mergeConfig(this.currentConfig, updates);
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.currentConfig, null, 2),
        "utf-8"
      );
    } catch (err) {
      console.error("[pi-voice-plugin] Error guardando config:", err);
    }
    return this.currentConfig;
  }

  public updateNested<K extends "openai" | "elevenlabs" | "kokoro" | "custom">(
    section: K,
    updates: Partial<VoicePluginConfig[K]>
  ): VoicePluginConfig {
    const updatedSection = { ...this.currentConfig[section], ...updates };
    return this.save({ [section]: updatedSection } as Partial<VoicePluginConfig>);
  }

  private mergeConfig(
    base: VoicePluginConfig,
    incoming: Partial<VoicePluginConfig>
  ): VoicePluginConfig {
    return {
      ...base,
      ...incoming,
      volume:
        typeof incoming.volume === "number"
          ? Math.max(0.0, Math.min(1.5, incoming.volume))
          : base.volume ?? 1.0,
      openai: {
        ...base.openai,
        ...(incoming.openai || {}),
      },
      elevenlabs: {
        ...base.elevenlabs,
        ...(incoming.elevenlabs || {}),
      },
      kokoro: {
        ...base.kokoro,
        ...(incoming.kokoro || {}),
      },
      custom: {
        ...base.custom,
        ...(incoming.custom || {}),
      },
    };
  }
}
