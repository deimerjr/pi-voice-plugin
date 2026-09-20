import type { CodeFilterMode } from "./config.ts";

export interface SanitizeOptions {
  filterCode?: CodeFilterMode;
  maxChars?: number;
}

export class TextSanitizer {
  /**
   * Sanitizes markdown and assistant response text for speech synthesis.
   */
  public static sanitize(text: string, options: SanitizeOptions = {}): string {
    if (!text || typeof text !== "string") {
      return "";
    }

    const filterCode = options.filterCode ?? "omit";
    const maxChars = options.maxChars ?? 4000;

    let clean = text;

    // 1. Remove thinking tags if present (<think>...</think>)
    clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, "");

    // 2. Handle fenced code blocks (```lang ... ```)
    const codeBlockRegex = /```[\s\S]*?```/g;
    if (filterCode === "omit") {
      clean = clean.replace(codeBlockRegex, "");
    } else if (filterCode === "mention") {
      clean = clean.replace(codeBlockRegex, "\n[Bloque de código omitido]\n");
    } else {
      // "raw": remove just the triple backticks and language tag
      clean = clean.replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, "$1");
      clean = clean.replace(/```/g, "");
    }

    // 3. Remove images: ![alt](url)
    clean = clean.replace(/!\[(.*?)\]\(.*?\)/g, "");

    // 4. Clean links: [text](url) -> text
    clean = clean.replace(/\[(.*?)\]\(.*?\)/g, "$1");

    // 5. Remove HTML tags but keep content, or strip specific tags
    clean = clean.replace(/<[^>]*>/g, " ");

    // 6. Handle markdown tables: remove separator rows (|---|---|) and replace pipes
    clean = clean.replace(/^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/gm, "");
    clean = clean.replace(/\|/g, " ");

    // 7. Inline code: `code` -> code
    clean = clean.replace(/`([^`]+)`/g, "$1");

    // 8. Headers (#, ##, ###, etc.)
    clean = clean.replace(/^#{1,6}\s+/gm, "");

    // 9. Bold, italic, strikethrough: **, *, __, _, ~~
    clean = clean.replace(/(\*\*|__)(.*?)\1/g, "$2");
    clean = clean.replace(/(\*|_)(.*?)\1/g, "$2");
    clean = clean.replace(/~~(.*?)~~/g, "$1");

    // 10. Horizontal rules (---, ***, ===)
    clean = clean.replace(/^[-*_]{3,}\s*$/gm, "");

    // 11. Blockquotes: > quote -> quote
    clean = clean.replace(/^>\s+/gm, "");

    // 12. Bullet points: * or - or + or numbered lists
    clean = clean.replace(/^[\s]*[-*+]\s+/gm, "");
    clean = clean.replace(/^[\s]*\d+\.\s+/gm, "");

    // 13. Clean repeated whitespace and multiple newlines
    clean = clean.replace(/[ \t]+/g, " ");
    clean = clean.replace(/\n\s*\n\s*\n+/g, "\n\n");
    clean = clean.trim();

    // 14. Cap maximum length if exceeded
    if (clean.length > maxChars) {
      // Try to cut at the last punctuation mark before maxChars
      const truncated = clean.slice(0, maxChars);
      const lastPunctuation = Math.max(
        truncated.lastIndexOf("."),
        truncated.lastIndexOf("!"),
        truncated.lastIndexOf("?"),
        truncated.lastIndexOf("\n")
      );

      if (lastPunctuation > maxChars * 0.7) {
        clean = truncated.slice(0, lastPunctuation + 1) + " (El resto de la respuesta continúa en pantalla).";
      } else {
        clean = truncated.trim() + "... (El resto de la respuesta continúa en pantalla).";
      }
    }

    return clean;
  }

  /**
   * Splits sanitized text into logical sentence chunks for low-latency pipelined speech.
   */
  public static splitSentences(text: string, minChunkChars: number = 60): string[] {
    if (!text || typeof text !== "string") return [];

    const rawSentences = text.split(/(?<=[.!?\n])\s+/);
    const chunks: string[] = [];
    let current = "";

    for (const raw of rawSentences) {
      const sentence = raw.trim();
      if (!sentence) continue;

      if (!current) {
        current = sentence;
      } else if (current.length + sentence.length < minChunkChars) {
        current += ` ${sentence}`;
      } else {
        chunks.push(current);
        current = sentence;
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks.length > 0 ? chunks : [text.trim()];
  }
}
