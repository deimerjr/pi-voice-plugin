import type { ElevenLabsProviderConfig } from "../config.ts";
import type { TTSProvider, SynthesisResult } from "./base.ts";

export class ElevenLabsProvider implements TTSProvider {
  public readonly id = "elevenlabs";
  public readonly name = "ElevenLabs";
  private config: ElevenLabsProviderConfig;
  private apiKey?: string;

  constructor(config: ElevenLabsProviderConfig, apiKey?: string) {
    this.config = config;
    this.apiKey = apiKey;
  }

  public async synthesize(text: string, signal?: AbortSignal): Promise<SynthesisResult> {
    if (!this.apiKey) {
      throw new Error(
        "Falta la clave de API para ElevenLabs. Configurá ELEVENLABS_API_KEY o usá /voice config."
      );
    }

    const normalizedBaseUrl = this.config.baseUrl.replace(/\/+$/, "");
    const voiceId = encodeURIComponent(this.config.voiceId || "21m00Tcm4TlvDq8ikWAM");
    const url = `${normalizedBaseUrl}/text-to-speech/${voiceId}`;

    const payload = {
      text,
      model_id: this.config.modelId || "eleven_multilingual_v2",
      voice_settings: {
        stability: this.config.stability ?? 0.5,
        similarity_boost: this.config.similarityBoost ?? 0.75,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `Error del proveedor ElevenLabs (${res.status} ${res.statusText}): ${errText}`
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    return {
      audioBuffer,
      format: "mp3",
    };
  }
}
