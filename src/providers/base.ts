export interface SynthesisResult {
  audioBuffer: Buffer;
  format: "wav" | "mp3" | "ogg" | "flac";
}

export interface TTSProvider {
  readonly id: string;
  readonly name: string;
  synthesize(text: string, signal?: AbortSignal): Promise<SynthesisResult>;
}
