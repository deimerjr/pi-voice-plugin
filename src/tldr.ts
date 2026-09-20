import { TextSanitizer } from "./sanitizer.ts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface TldrOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export class TldrSummarizer {
  /**
   * Generates a concise 1-2 sentence executive summary for audio playback.
   */
  public static async summarize(
    text: string,
    options: TldrOptions = {}
  ): Promise<string> {
    const clean = TextSanitizer.sanitize(text);
    if (!clean || clean.length < 180) {
      return clean;
    }

    // Attempt AI-powered fast executive summary
    try {
      const summary = await this.summarizeWithLLM(clean, options);
      if (summary && summary.trim().length > 10) {
        return TextSanitizer.sanitize(summary.trim());
      }
    } catch {
      // Fallback to heuristic extractive summary
    }

    return this.extractHeuristicSummary(clean);
  }

  /**
   * Tries to call an OpenAI-compatible endpoint (CPA local on 8317 or OpenAI).
   */
  private static async summarizeWithLLM(
    text: string,
    options: TldrOptions
  ): Promise<string> {
    const timeoutMs = options.timeoutMs ?? 3000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Detect CPA key if local 8317 is used
      let baseUrl = options.baseUrl;
      let apiKey = options.apiKey;

      if (!baseUrl) {
        // Check if local CPA is running
        const cpaKeyFile = path.join(os.homedir(), ".config", "cli-proxy-api", "api.key");
        if (fs.existsSync(cpaKeyFile)) {
          baseUrl = "http://127.0.0.1:8317/v1";
          apiKey = fs.readFileSync(cpaKeyFile, "utf-8").trim();
        } else {
          baseUrl = "https://api.openai.com/v1";
          apiKey = apiKey || process.env.OPENAI_API_KEY;
        }
      }

      if (!apiKey) {
        throw new Error("No API key available for TL;DR summary");
      }

      const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
      const model = options.model || (baseUrl.includes("8317") ? "gemini-3.8-flash-high" : "gpt-4o-mini");

      const payload = {
        model,
        messages: [
          {
            role: "system",
            content:
              "Sos un asistente de voz conciso. Generá un resumen ejecutivo en español de máximo 2 oraciones directas para ser leído por voz. Sé natural y directo, sin saludos ni introducciones.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 100,
        temperature: 0.3,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`LLM status ${res.status}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      return data.choices?.[0]?.message?.content || "";
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Fast offline heuristic summary: extracts the most relevant 1-2 sentences.
   */
  public static extractHeuristicSummary(text: string): string {
    const sentences = TextSanitizer.splitSentences(text, 50);
    if (sentences.length <= 2) {
      return text;
    }

    // Check for sentences containing conclusion keywords
    const keywords = ["en resumen", "listo", "corregí", "agregué", "implementé", "se solucionó", "quedó"];
    for (const s of sentences) {
      const lower = s.toLowerCase();
      if (keywords.some((k) => lower.includes(k))) {
        // Return this sentence plus the first sentence if different
        if (s !== sentences[0]) {
          return `${sentences[0]} ${s}`;
        }
        return s;
      }
    }

    // Default to the first two clear sentences
    return `${sentences[0]} ${sentences[1]}`;
  }
}
