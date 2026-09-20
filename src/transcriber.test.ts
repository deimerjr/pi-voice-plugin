import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { AudioTranscriber } from "./transcriber.ts";

describe("AudioTranscriber", () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = "";
  let interceptedHeaders: any = null;
  let interceptedBody: any = null;

  beforeEach(() => {
    interceptedUrl = "";
    interceptedHeaders = null;
    interceptedBody = null;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("formats multipart request and parses transcript text", async () => {
    globalThis.fetch = async (url: any, options: any) => {
      interceptedUrl = String(url);
      interceptedHeaders = options.headers;
      interceptedBody = options.body;
      return new Response(JSON.stringify({ text: "Esta es una transcripción de prueba" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const transcriber = new AudioTranscriber({
      provider: "openai",
      apiKey: "sk-test-stt-key",
      baseUrl: "https://api.openai.com/v1",
      model: "whisper-1",
      language: "es",
    });

    const fakeWav = Buffer.from("RIFFfakeaudioWAVE");
    const result = await transcriber.transcribe(fakeWav);

    assert.equal(result, "Esta es una transcripción de prueba");
    assert.equal(interceptedUrl, "https://api.openai.com/v1/audio/transcriptions");
    assert.equal(interceptedHeaders["Authorization"], "Bearer sk-test-stt-key");
    assert.ok(interceptedBody instanceof FormData);
  });

  it("throws error if audio buffer is empty", async () => {
    const transcriber = new AudioTranscriber({
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      model: "whisper-1",
    });

    await assert.rejects(async () => {
      await transcriber.transcribe(Buffer.alloc(0));
    }, { message: /buffer de audio está vacío/ });
  });
});
