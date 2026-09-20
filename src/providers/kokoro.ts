import type { KokoroProviderConfig } from "../config.ts";
import type { TTSProvider, SynthesisResult } from "./base.ts";

export class KokoroProvider implements TTSProvider {
  public readonly id = "kokoro";
  public readonly name = "Kokoro TTS Local";
  private config: KokoroProviderConfig;

  constructor(config: KokoroProviderConfig) {
    this.config = config;
  }

  public async synthesize(text: string, signal?: AbortSignal): Promise<SynthesisResult> {
    const normalizedBaseUrl = (this.config.baseUrl || "http://127.0.0.1:8880/v1").replace(/\/+$/, "");
    const url = `${normalizedBaseUrl}/audio/speech`;

    const payload = {
      model: this.config.model || "tts-1",
      input: text,
      voice: this.config.voice || "ef_dora",
      speed: this.config.speed || 1.0,
      response_format: this.config.format || "wav",
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (err: any) {
      throw new Error(
        `No se pudo conectar con el servidor Kokoro TTS local en ${normalizedBaseUrl}. ¿Está corriendo? Ejecutá 'kokoro-tts start' en tu terminal.`
      );
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `Error del servidor Kokoro TTS local (${res.status} ${res.statusText}): ${errText}`
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
