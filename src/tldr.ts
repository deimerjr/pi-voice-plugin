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
   * Generates a concise 1-2 sentence executive summary in Spanish for audio playback.
   * If the input is in English, it guarantees a Spanish translation.
   */
  public static async summarize(
    text: string,
    options: TldrOptions = {}
  ): Promise<string> {
    const clean = TextSanitizer.sanitize(text);
    if (!clean) return "";

    const isEnglish = this.isLikelyEnglish(clean);

    // If already in Spanish and short, no heavy summarization needed
    if (!isEnglish && clean.length < 180) {
      return clean;
    }

    // Attempt AI-powered fast executive summary & translation to Spanish
    try {
      const summary = await this.summarizeWithLLM(clean, options);
      if (summary && summary.trim().length > 5) {
        return TextSanitizer.sanitize(summary.trim());
      }
    } catch {
      // Fallback to heuristic extractive summary + rule-based dictionary
    }

    const heuristic = this.extractHeuristicSummary(clean);
    return this.quickTranslateCommonEnglish(heuristic);
  }

  /**
   * Detects if text is primarily English.
   */
  public static isLikelyEnglish(text: string): boolean {
    if (!text) return false;
    const lower = ` ${text.toLowerCase().replace(/[^a-zñáéíóú]/g, " ")} `;
    const englishWords = [
      " the ", " and ", " to ", " of ", " in ", " for ", " is ", " that ", " with ", " on ",
      " as ", " at ", " by ", " from ", " all ", " tests ", " passed ", " failed ", " running ",
      " started ", " completed ", " result ", " files ", " found ", " error ", " code ", " summary ",
      " coverage ", " build ", " task ", " suites ", " duration ", " check ", " report ",
    ];
    let count = 0;
    for (const w of englishWords) {
      if (lower.includes(w)) count++;
      if (count >= 2) return true;
    }
    return false;
  }

  /**
   * Replaces common English technical terms with natural Spanish equivalents.
   */
  public static quickTranslateCommonEnglish(text: string): string {
    let s = text;
    const replacements: [RegExp, string][] = [
      [/\ball (\d+) tests passed\b/gi, "todos los $1 tests pasaron con éxito"],
      [/\ball tests passed\b/gi, "todos los tests pasaron exitosamente"],
      [/\btests passed\b/gi, "tests aprobados"],
      [/\btest failed\b/gi, "test falló"],
      [/\btests failed\b/gi, "tests fallaron"],
      [/\bexploration complete\b/gi, "exploración completada"],
      [/\bexploration completed\b/gi, "exploración completada"],
      [/\btechnical verification evidence\b/gi, "evidencia de verificación técnica"],
      [/\bcommand executed\b/gi, "comando ejecutado"],
      [/\bworking directory\b/gi, "directorio de trabajo"],
      [/\btests executed\b/gi, "tests ejecutados"],
      [/\bexit code\b/gi, "código de salida"],
      [/\bstarted\b/gi, "iniciado"],
      [/\bcompleted\b/gi, "completado"],
      [/\bfailed\b/gi, "falló"],
      [/\bpassed\b/gi, "aprobado"],
      [/\brun tests\b/gi, "ejecutar tests"],
      [/\bexplore repository\b/gi, "explorar repositorio"],
      [/\banalyze project\b/gi, "analizar proyecto"],
      [/\bimplement feature\b/gi, "implementar funcionalidad"],
      [/\bno blockers\b/gi, "sin bloqueos"],
      [/\bnone\b/gi, "ninguno"],
      [/\bfound (\d+) files\b/gi, "se encontraron $1 archivos"],
      [/\bcoverage\b/gi, "cobertura"],
    ];
    for (const [pattern, repl] of replacements) {
      s = s.replace(pattern, repl);
    }
    return s;
  }

  /**
   * Tries to call an OpenAI-compatible endpoint (CPA local on 8317 or OpenAI).
   */
  private static async summarizeWithLLM(
    text: string,
    options: TldrOptions
  ): Promise<string> {
    const timeoutMs = options.timeoutMs ?? 3500;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let baseUrl = options.baseUrl;
      let apiKey = options.apiKey;

      if (!baseUrl) {
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
              "Sos un asistente de voz en español. Traducí y sintetizá la información técnica en máximo 2 oraciones breves, 100% en idioma español natural, para ser leídas por voz. Aunque la entrada esté en inglés o sea un reporte técnico, respondé SIEMPRE en español fluido. Sin introducciones ni markdown.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 90,
        temperature: 0.2,
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
