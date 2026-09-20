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

    const fakeWav = Buffer.alloc(46);
    fakeWav.write("RIFF", 0);
    fakeWav.writeUInt32LE(38, 4);
    fakeWav.write("WAVEfmt ", 8);
    fakeWav.writeUInt32LE(16, 16);
    fakeWav.writeUInt16LE(1, 20);
    fakeWav.writeUInt16LE(1, 22);
    fakeWav.writeUInt32LE(16000, 24);
    fakeWav.writeUInt32LE(32000, 28);
    fakeWav.writeUInt16LE(2, 32);
    fakeWav.writeUInt16LE(16, 34);
    fakeWav.write("data", 36);
    fakeWav.writeUInt32LE(2, 40);
    fakeWav.writeInt16LE(5000, 44);

    const result = await transcriber.transcribe(fakeWav);

    assert.equal(result, "Esta es una transcripción de prueba");
    assert.equal(interceptedUrl, "https://api.openai.com/v1/audio/transcriptions");
    assert.equal(interceptedHeaders["Authorization"], "Bearer sk-test-stt-key");
    assert.ok(interceptedBody instanceof FormData);
  });

  it("detects silence and filters Whisper hallucinations", () => {
    assert.equal(
      AudioTranscriber.isHallucination("Subtítulos realizados por la comunidad de Amara.org"),
      true
    );
    assert.equal(
      AudioTranscriber.isHallucination("Subtitulado por la comunidad de Amara.org."),
      true
    );
    assert.equal(
      AudioTranscriber.isHallucination("Amara.org"),
      true
    );
    assert.equal(
      AudioTranscriber.isHallucination("Creá una función de ordenamiento rápido"),
      false
    );
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
