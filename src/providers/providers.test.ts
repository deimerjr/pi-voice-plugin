import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { OpenAIProvider } from "./openai.ts";
import { ElevenLabsProvider } from "./elevenlabs.ts";
import { CustomHttpProvider } from "./custom.ts";
import { createTTSProvider } from "./factory.ts";
import { DEFAULT_CONFIG } from "../config.ts";

describe("TTS Providers", () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = "";
  let interceptedOptions: any = null;

  beforeEach(() => {
    interceptedUrl = "";
    interceptedOptions = null;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("OpenAIProvider formats request correctly", async () => {
    globalThis.fetch = async (url: any, options: any) => {
      interceptedUrl = String(url);
      interceptedOptions = options;
      return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 });
    };

    const provider = new OpenAIProvider(
      {
        baseUrl: "https://api.openai.com/v1",
        model: "tts-1",
        voice: "nova",
        speed: 1.0,
        format: "wav",
      },
      "sk-test-key"
    );

    const result = await provider.synthesize("Hola mundo");

    assert.equal(interceptedUrl, "https://api.openai.com/v1/audio/speech");
    assert.equal(interceptedOptions.method, "POST");
    assert.equal(interceptedOptions.headers.Authorization, "Bearer sk-test-key");

    const body = JSON.parse(interceptedOptions.body);
    assert.equal(body.input, "Hola mundo");
    assert.equal(body.voice, "nova");
    assert.equal(body.model, "tts-1");
    assert.equal(body.response_format, "wav");

    assert.equal(result.format, "wav");
    assert.equal(result.audioBuffer.length, 4);
  });

  it("OpenAIProvider throws clear error when apiKey is missing", async () => {
    const provider = new OpenAIProvider(DEFAULT_CONFIG.openai, undefined);
    await assert.rejects(
      async () => {
        await provider.synthesize("test");
      },
      {
        message: /Falta la clave de API para OpenAI/,
      }
    );
  });

  it("ElevenLabsProvider formats request with xi-api-key and voiceId", async () => {
    globalThis.fetch = async (url: any, options: any) => {
      interceptedUrl = String(url);
      interceptedOptions = options;
      return new Response(new Uint8Array([5, 6, 7]), { status: 200 });
    };

    const provider = new ElevenLabsProvider(
      {
        baseUrl: "https://api.elevenlabs.io/v1",
        voiceId: "voice-123",
        modelId: "eleven_multilingual_v2",
        stability: 0.7,
        similarityBoost: 0.8,
      },
      "eleven-key"
    );

    const result = await provider.synthesize("Texto para sintetizar");

    assert.equal(interceptedUrl, "https://api.elevenlabs.io/v1/text-to-speech/voice-123");
    assert.equal(interceptedOptions.headers["xi-api-key"], "eleven-key");
    assert.equal(result.format, "mp3");
  });

  it("CustomHttpProvider supports custom URL and method", async () => {
    globalThis.fetch = async (url: any, options: any) => {
      interceptedUrl = String(url);
      interceptedOptions = options;
      return new Response(new Uint8Array([8, 9]), { status: 200 });
    };

    const provider = new CustomHttpProvider({
      url: "http://127.0.0.1:9000/speak",
      method: "POST",
      format: "wav",
      headers: { "X-Custom": "Secret" },
    });

    const result = await provider.synthesize("Prueba custom");

    assert.equal(interceptedUrl, "http://127.0.0.1:9000/speak");
    assert.equal(interceptedOptions.headers["X-Custom"], "Secret");
    assert.equal(result.format, "wav");
  });

  it("createTTSProvider creates matching instance", () => {
    const provider = createTTSProvider(DEFAULT_CONFIG, "sk-key");
    assert.equal(provider.id, "openai");
  });
});
