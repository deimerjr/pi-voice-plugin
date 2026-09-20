export interface STTProviderConfig {
  provider: "openai" | "groq" | "custom";
  apiKey?: string;
  baseUrl: string;
  model: string;
  language?: string;
}

export class AudioTranscriber {
  private config: STTProviderConfig;

  constructor(config: STTProviderConfig) {
    this.config = config;
  }

  public async transcribe(
    audioBuffer: Buffer,
    options: { signal?: AbortSignal } = {}
  ): Promise<string> {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error("El buffer de audio está vacío.");
    }

    const normalizedBaseUrl = (this.config.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
    const url = `${normalizedBaseUrl}/audio/transcriptions`;

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: "audio/wav" });
    formData.append("file", blob, "speech.wav");
    formData.append("model", this.config.model || "whisper-1");

    if (this.config.language) {
      formData.append("language", this.config.language);
    }

    const headers: Record<string, string> = {};
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
      signal: options.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `Error de transcripción STT (${res.status} ${res.statusText}): ${errText}`
      );
    }

    const json = (await res.json()) as { text?: string };
    return (json.text || "").trim();
  }
}
