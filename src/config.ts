import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { ConcurrencyMode } from "./lock.ts";

export type SpeechProviderType = "openai" | "elevenlabs" | "kokoro" | "custom";
export type CodeFilterMode = "omit" | "mention" | "raw";
export type SpeechMode = "final" | "all";
export type TldrLevel = "high" | "medium" | "low";

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

export interface STTConfig {
  enabled: boolean;
  provider: "openai" | "groq" | "custom";
  apiKey?: string;
  baseUrl: string;
  model: string;
  language?: string;
}

export interface VoiceShortcutsConfig {
  menu: string;
  stop: string;
  record: string;
  volumeUp: string;
  volumeDown: string;
}

export interface SubagentVoicesConfig {
  enabled: boolean;
  crewMode: boolean;
  announceStart: boolean;
  announceEnd: boolean;
  announceOrchestratorPhases: boolean;
  announceTests?: boolean;
  orchestrator: string;
  scout: string;
  worker: string;
  reviewer: string;
  userTitle?: string;
  scoutName?: string;
  workerName?: string;
  reviewerName?: string;
  orchestratorName?: string;
}

export interface VoicePluginConfig {
  enabled: boolean;
  autoRead: boolean;
  tldr: boolean;
  tldrLevel?: TldrLevel;
  announceProject?: boolean;
  mode: SpeechMode;
  filterCode: CodeFilterMode;
  provider: SpeechProviderType;
  maxCharsPerSpeech: number;
  playerCommand?: string;
  volume: number;
  concurrency?: ConcurrencyMode;
  openai: OpenAIProviderConfig;
  elevenlabs: ElevenLabsProviderConfig;
  kokoro: KokoroProviderConfig;
  custom: CustomProviderConfig;
  stt: STTConfig;
  shortcuts: VoiceShortcutsConfig;
  subagents: SubagentVoicesConfig;
}

export const DEFAULT_CONFIG: VoicePluginConfig = {
  enabled: true,
  autoRead: false,
  tldr: false,
  tldrLevel: "medium",
  announceProject: false,
  mode: "final",
  filterCode: "omit",
  provider: "openai",
  maxCharsPerSpeech: 4000,
  volume: 1.0,
  concurrency: "queue",
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
  stt: {
    enabled: true,
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "whisper-1",
    language: "es",
  },
  shortcuts: {
    menu: "alt+v",
    stop: "alt+s",
    record: "alt+r",
    volumeUp: "alt+up",
    volumeDown: "alt+down",
  },
  subagents: {
    enabled: true,
    crewMode: true,
    announceStart: true,
    announceEnd: true,
    announceOrchestratorPhases: true,
    announceTests: true,
    orchestrator: "dora_heart",
    scout: "ef_dora",
    worker: "em_alex",
    reviewer: "em_santa",
    userTitle: "Jefe",
    scoutName: "Dora",
    workerName: "Alex",
    reviewerName: "Santa",
    orchestratorName: "el Gentleman",
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

  public getActiveSTTApiKey(): string | undefined {
    return ConfigManager.cleanApiKey(
      this.currentConfig.stt?.apiKey ||
      process.env.GROQ_API_KEY ||
      this.currentConfig.openai?.apiKey ||
      process.env.OPENAI_API_KEY
    );
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

  public updateNested<K extends "openai" | "elevenlabs" | "kokoro" | "custom" | "stt" | "shortcuts" | "subagents">(
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
      tldr: typeof incoming.tldr === "boolean" ? incoming.tldr : base.tldr ?? false,
      tldrLevel:
        incoming.tldrLevel && ["high", "medium", "low"].includes(incoming.tldrLevel)
          ? incoming.tldrLevel
          : base.tldrLevel ?? "medium",
      announceProject:
        typeof incoming.announceProject === "boolean"
          ? incoming.announceProject
          : base.announceProject ?? false,
      volume:
        typeof incoming.volume === "number"
          ? Math.max(0.0, Math.min(1.5, incoming.volume))
          : base.volume ?? 1.0,
      concurrency:
        incoming.concurrency && ["queue", "interrupt", "focus", "off"].includes(incoming.concurrency)
          ? incoming.concurrency
          : base.concurrency ?? "queue",
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
      stt: {
        ...base.stt,
        ...(incoming.stt || {}),
      },
      shortcuts: {
        ...base.shortcuts,
        ...(incoming.shortcuts || {}),
      },
      subagents: {
        ...base.subagents,
        ...(incoming.subagents || {}),
        scoutName:
          typeof incoming.subagents?.scoutName === "string" && incoming.subagents.scoutName.trim()
            ? incoming.subagents.scoutName.trim()
            : base.subagents?.scoutName ?? "Dora",
        workerName:
          typeof incoming.subagents?.workerName === "string" && incoming.subagents.workerName.trim()
            ? incoming.subagents.workerName.trim()
            : base.subagents?.workerName ?? "Alex",
        reviewerName:
          typeof incoming.subagents?.reviewerName === "string" && incoming.subagents.reviewerName.trim()
            ? incoming.subagents.reviewerName.trim()
            : base.subagents?.reviewerName ?? "Santa",
        orchestratorName:
          typeof incoming.subagents?.orchestratorName === "string" && incoming.subagents.orchestratorName.trim()
            ? incoming.subagents.orchestratorName.trim()
            : base.subagents?.orchestratorName ?? "el Gentleman",
      },
    };
  }
}
