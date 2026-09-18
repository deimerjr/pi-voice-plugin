import type { OpenAIProviderConfig } from "../config.ts";
import type { TTSProvider, SynthesisResult } from "./base.ts";

export class OpenAIProvider implements TTSProvider {
  public readonly id = "openai";
  public readonly name = "OpenAI / Compatible";
  private config: OpenAIProviderConfig;
  private apiKey?: string;

  constructor(config: OpenAIProviderConfig, apiKey?: string) {
    this.config = config;
    this.apiKey = apiKey;
  }

  public async synthesize(text: string, signal?: AbortSignal): Promise<SynthesisResult> {
    if (!this.apiKey) {
      throw new Error(
        "Falta la clave de API para OpenAI/Compatible. Configurá OPENAI_API_KEY o usá /voice config."
      );
    }

    const normalizedBaseUrl = this.config.baseUrl.replace(/\/+$/, "");
    const url = `${normalizedBaseUrl}/audio/speech`;

    const payload = {
      model: this.config.model || "tts-1",
      input: text,
      voice: this.config.voice || "nova",
      speed: this.config.speed || 1.0,
      response_format: this.config.format || "wav",
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `Error del proveedor OpenAI TTS (${res.status} ${res.statusText}): ${errText}`
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    return {
      audioBuffer,
      format: (this.config.format as any) || "wav",
    };
  }
}
