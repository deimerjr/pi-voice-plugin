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

  /**
   * Detects if a WAV buffer contains only silence or very low noise.
   */
  public static isBufferSilent(wavBuffer: Buffer, threshold: number = 180): boolean {
    if (!wavBuffer || wavBuffer.length < 44) return true;
    if (wavBuffer.toString("ascii", 0, 4) !== "RIFF") return false;

    let offset = 12;
    while (offset < wavBuffer.length - 8) {
      const chunkId = wavBuffer.toString("ascii", offset, offset + 4);
      const chunkSize = wavBuffer.readUInt32LE(offset + 4);
      if (chunkId === "data") {
        const dataStart = offset + 8;
        const dataEnd = Math.min(dataStart + chunkSize, wavBuffer.length);
        let sum = 0;
        let count = 0;
        for (let i = dataStart; i < dataEnd - 1; i += 2) {
          sum += Math.abs(wavBuffer.readInt16LE(i));
          count++;
        }
        const avg = count > 0 ? sum / count : 0;
        return avg < threshold;
      }
      offset += 8 + chunkSize;
    }
    return false;
  }

  /**
   * Filters out common Whisper hallucinations generated on silence or low noise.
   */
  public static isHallucination(text: string): boolean {
    if (!text) return true;
    const norm = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

    if (!norm || norm.length < 2) return true;

    const blacklist = [
      "amaraorg",
      "subtitulosrealizadosporlacomunidaddeamaraorg",
      "subtituladoporlacomunidaddeamaraorg",
      "subtitulosporlacomunidaddeamaraorg",
      "suscribetealcanal",
      "suscribeteamicanal",
      "graciasporverelvideo",
      "hastalaproxima",
      "yesoestodo",
      "transcripcionpor",
      "subtitulospor",
      "subtituladopor",
    ];

    return blacklist.some((b) => norm.includes(b) || (b.length > 12 && b.includes(norm)));
  }

  public async transcribe(
    audioBuffer: Buffer,
    options: { signal?: AbortSignal } = {}
  ): Promise<string> {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error("El buffer de audio está vacío.");
    }

    // Short-circuit if microphone captured pure silence
    if (AudioTranscriber.isBufferSilent(audioBuffer)) {
      return "";
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
    const rawText = (json.text || "").trim();

    if (AudioTranscriber.isHallucination(rawText)) {
      return "";
    }

    return rawText;
  }
}
