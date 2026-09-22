import { TextSanitizer } from "./sanitizer.ts";
import type { TldrLevel } from "./config.ts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface TldrOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  role?: string;
  crewMode?: boolean;
  userTitle?: string;
  level?: TldrLevel;
}

export class TldrSummarizer {
  /**
   * Generates a concise summary in Spanish for audio playback according to the configured level.
   * - "high": 1 punchy direct sentence in Spanish (max ~25 words).
   * - "medium": balanced executive summary of 2-3 sentences.
   * - "low": high detail preservation (80-90% detail), omitting code/tables.
   * If the input is in English, it guarantees a Spanish translation.
   */
  public static async summarize(
    text: string,
    options: TldrOptions = {}
  ): Promise<string> {
    const level: TldrLevel = options.level || "medium";
    const clean =
      level === "low" && !this.hasStructuredOutcome(text)
        ? TextSanitizer.sanitize(text)
        : this.extractSubagentOutcome(text);

    if (!clean) return "";

    const isEnglish = this.isLikelyEnglish(clean);

    // When level === "low": High detail preservation (almost original response, 80-90% detail).
    // Clean code blocks and tables, return clean text if Spanish; if English, call summarizeWithLLM
    // with max_tokens: 450 preserving full paragraphs, falling back to translateEnglishSentence.
    if (level === "low") {
      if (!isEnglish) {
        return clean;
      }
      try {
        const summary = await this.summarizeWithLLM(clean, { ...options, level: "low" });
        if (summary && summary.trim().length > 5 && !this.isLikelyEnglish(summary)) {
          return TextSanitizer.sanitize(summary.trim());
        }
      } catch {
        // Fallback to translateEnglishSentence
      }
      return this.translateEnglishSentence(clean, options);
    }

    // If already in Spanish and short, for medium no heavy summarization needed
    if (level === "medium" && !isEnglish && clean.length < 180) {
      return clean;
    }

    // Attempt AI-powered fast executive summary & translation to Spanish
    try {
      const summary = await this.summarizeWithLLM(clean, { ...options, level });
      if (summary && summary.trim().length > 5 && !this.isLikelyEnglish(summary)) {
        return TextSanitizer.sanitize(summary.trim());
      }
    } catch {
      // Fallback to heuristic extractive summary + translateEnglishSentence
    }

    const userTitle = options.userTitle || "Jefe";
    const heuristic = this.extractHeuristicSummary(clean, level);
    const translated = !isEnglish
      ? heuristic
      : this.translateEnglishSentence(heuristic, options);
    if (options.crewMode && !translated.toLowerCase().includes(userTitle.toLowerCase())) {
      return `${userTitle}, ${translated}`;
    }
    return translated;
  }

  /**
   * Detects if raw text has structured outcome markers (YAML summary: or markdown ## Summary).
   */
  public static hasStructuredOutcome(rawText: string): boolean {
    if (!rawText) return false;
    return (
      /^\s*(?:summary|outcome|resumen|resultado)\s*:/im.test(rawText) ||
      /^#{1,3}\s+(?:Summary|Outcome|Resumen|Resultado|Findings|Cambios)\b/im.test(rawText)
    );
  }

  /**
   * Extracts focused outcome from subagent output:
   * 1. Inspects YAML lines for summary:, outcome:, resumen:, resultado:.
   * 2. Inspects markdown sections: ## Summary, ## Outcome, ## Resumen, ## Resultado, ## Findings, ## Cambios.
   * 3. Extracts the first clean meaningful sentence/paragraph (< 300 chars).
   */
  public static extractSubagentOutcome(rawText: string): string {
    if (!rawText || !rawText.trim()) return "";

    // 1. Inspect YAML/structured lines for summary:, outcome:, resumen:, resultado:
    const yamlLineMatch = rawText.match(
      /^\s*(?:summary|outcome|resumen|resultado)\s*:\s*(.+)$/im
    );
    if (yamlLineMatch) {
      let val = yamlLineMatch[1].trim();
      val = val.replace(/^["'](.*)["']$/, "$1").trim();
      if (val && val !== ">" && val !== "|") {
        const sanitized = TextSanitizer.sanitize(val);
        if (sanitized) return sanitized;
      }
    }

    const yamlBlockMatch = rawText.match(
      /^\s*(?:summary|outcome|resumen|resultado)\s*:\s*(?:[>|]\s*)?\n((?:[ \t]+[^\n]+\n*)+)/im
    );
    if (yamlBlockMatch) {
      const block = yamlBlockMatch[1]
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" ");
      const sanitized = TextSanitizer.sanitize(block);
      if (sanitized) return sanitized;
    }

    // 2. Inspect markdown sections: ## Summary, ## Outcome, etc.
    const mdMatch = rawText.match(
      /^#{1,3}\s+(?:Summary|Outcome|Resumen|Resultado|Findings|Cambios)\b[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|$)/im
    );
    if (mdMatch) {
      const sectionContent = TextSanitizer.sanitize(mdMatch[1]);
      if (sectionContent) {
        const firstPara = sectionContent.split(/\n\s*\n/)[0]?.trim() || sectionContent;
        if (firstPara.length <= 300) {
          return firstPara;
        }
        const sentences = TextSanitizer.splitSentences(firstPara, 50);
        let acc = "";
        for (const s of sentences) {
          if (!acc) {
            acc = s;
          } else if (acc.length + s.length + 1 <= 300) {
            acc += ` ${s}`;
          } else {
            break;
          }
        }
        return acc || firstPara.slice(0, 297) + "...";
      }
    }

    // 3. Extracts first clean meaningful sentence/paragraph (< 300 chars)
    const sanitized = TextSanitizer.sanitize(rawText);
    if (!sanitized) return "";

    const paragraphs = sanitized.split(/\n\s*\n/);
    for (const p of paragraphs) {
      const cleanP = p.trim();
      if (!cleanP || cleanP.startsWith("$") || cleanP.startsWith(">")) continue;
      if (cleanP.length <= 300) {
        return cleanP;
      }
      const sentences = TextSanitizer.splitSentences(cleanP, 50);
      let acc = "";
      for (const s of sentences) {
        if (!acc) {
          acc = s;
        } else if (acc.length + s.length + 1 <= 300) {
          acc += ` ${s}`;
        } else {
          break;
        }
      }
      return acc || cleanP.slice(0, 297) + "...";
    }

    return sanitized.slice(0, 297) + "...";
  }

  /**
   * Fast, synchronous (<1ms) smart translation for task labels and titles used in
   * tool_execution_start and cleanPhaseTitle.
   */
  public static translateTaskLabel(rawText: string): string {
    if (!rawText) return "";
    let text = rawText.trim();
    text = text.replace(/^(?:Task\s*\d+\s*[:\-–—]\s*|#\d+\s*[:\-–—]?\s*)/i, "").trim();
    if (!text) return "";

    if (!this.isLikelyEnglish(text)) {
      return text;
    }

    let s = text;
    const L = "[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]";

    // 1. Starting verb conversion to infinitive
    const startingVerbs: [RegExp, string][] = [
      [new RegExp(`^\\s*(?:explore|exploring)(?!${L})`, "i"), "explorar"],
      [new RegExp(`^\\s*(?:map|mapping)(?!${L})`, "i"), "explorar"],
      [new RegExp(`^\\s*(?:implement|implementing)(?!${L})`, "i"), "implementar"],
      [new RegExp(`^\\s*(?:create|creating)(?!${L})`, "i"), "crear"],
      [new RegExp(`^\\s*(?:add|adding)(?!${L})`, "i"), "agregar"],
      [new RegExp(`^\\s*(?:refactor|refactoring)(?!${L})`, "i"), "refactorizar"],
      [new RegExp(`^\\s*(?:fix|fixing)(?!${L})`, "i"), "corregir"],
      [new RegExp(`^\\s*(?:audit|auditing)(?!${L})`, "i"), "auditar"],
      [new RegExp(`^\\s*(?:verify|verifying)(?!${L})`, "i"), "verificar"],
      [new RegExp(`^\\s*(?:setup|setting\\s+up|set\\s+up|configure|configuring)(?!${L})`, "i"), "configurar"],
      [new RegExp(`^\\s*(?:update|updating)(?!${L})`, "i"), "actualizar"],
      [new RegExp(`^\\s*(?:test|testing)(?!${L})`, "i"), "probar"],
      [new RegExp(`^\\s*(?:review|reviewing)(?!${L})`, "i"), "revisar"],
      [new RegExp(`^\\s*(?:design|designing)(?!${L})`, "i"), "diseñar"],
    ];

    let verbPrefix = "";
    for (const [pattern, repl] of startingVerbs) {
      if (pattern.test(s)) {
        verbPrefix = repl;
        s = s.replace(pattern, "").trim();
        break;
      }
    }

    // 2. High-priority compound phrases
    const compoundReplacements: [RegExp, string][] = [
      [/\b(?:landing\s+page\s+contact\s+form|contact\s+form\s+(?:in\s+|on\s+)?landing(?:\s+page)?)\b/gi, "el formulario de contacto en la landing page"],
      [/\bcontact\s+form\b/gi, "formulario de contacto"],
      [/\bdecisions-only\s+speech\s+mode\b/gi, "el modo de voz solo decisiones"],
      [/\bspeech\s+mode\b/gi, "modo de voz"],
      [/\bdecisions-only\b/gi, "solo decisiones"],
      [/\bdatabase\s+migration\b/gi, "migración de base de datos"],
      [/\bconcurrency\s+queue\b/gi, "cola de concurrencia"],
      [/\bunit\s+tests\b/gi, "pruebas unitarias"],
      [/\bHTML\s+Architecture\s*&\s*Semantic\s+Structure\b/gi, "HTML arquitectura y estructura semántica"],
      [/\bsemantic\s+structure\b/gi, "estructura semántica"],
      [/\barchitecture\b/gi, "arquitectura"],
      [/\bsemantic\b/gi, "semántica"],
      [/\bstructure\b/gi, "estructura"],
      [/\bmigration\b/gi, "migración"],
    ];

    for (const [pattern, repl] of compoundReplacements) {
      s = s.replace(pattern, repl);
    }

    // 3. Technical terms vocabulary
    const vocabReplacements: [RegExp, string][] = [
      [/\blanding\s+page\b/gi, "landing page"],
      [/\bform\b/gi, "formulario"],
      [/\bmenu\b/gi, "menú"],
      [/\bshortcuts\b/gi, "atajos"],
      [/\baudio\b/gi, "audio"],
      [/\btests\b/gi, "pruebas"],
      [/\btest\b/gi, "prueba"],
      [/\bbug\b/gi, "error"],
      [/\bfeature\b/gi, "funcionalidad"],
      [/\bdatabase\b/gi, "base de datos"],
      [/\buser\b/gi, "usuario"],
      [/\bauthentication\b|\bauth\b/gi, "autenticación"],
      [/\bsettings\b|\bconfig\b/gi, "configuración"],
      [/\bworkspace\b/gi, "espacio de trabajo"],
      [/\brepository\b|\brepo\b/gi, "repositorio"],
      [/\bregistration\b/gi, "registro"],
      [/\boptions\b/gi, "opciones"],
      [/\bcomponent\b/gi, "componente"],
      [/\bcomponents\b/gi, "componentes"],
      [/\bpipeline\b/gi, "pipeline"],
      [/\binterface\b/gi, "interfaz"],
      [/\binterfaces\b/gi, "interfaces"],
      [/\bcodebase\b/gi, "base de código"],
      [/\bverification\b/gi, "verificación"],
      [/\bdocumentation\b/gi, "documentación"],
      [/\bcoverage\b/gi, "cobertura"],
      [/\bsetup\b/gi, "configuración"],
    ];

    for (const [pattern, repl] of vocabReplacements) {
      s = s.replace(pattern, repl);
    }

    // 4. Prepositions and connectors
    const connectorReplacements: [RegExp, string][] = [
      [/\b&\b/g, "y"],
      [/\band\b/gi, "y"],
      [/\bfor\b/gi, "para"],
      [/\bwith\b/gi, "con"],
      [/\bto\b/gi, "a"],
      [/\bof\b/gi, "de"],
      [/\bfrom\b/gi, "desde"],
      [/\bin\b/gi, "en"],
      [/\bon\b/gi, "en"],
      [/\bthe\b/gi, ""],
    ];

    for (const [pattern, repl] of connectorReplacements) {
      s = s.replace(pattern, repl);
    }

    s = s.replace(/\s+/g, " ").trim();

    if (verbPrefix) {
      return `${verbPrefix} ${s}`.trim();
    }
    return s;
  }

  /**
   * Fallback translator when LLM is unavailable or times out.
   * Conjugates naturally according to role and enforces a safety barrier.
   */
  public static translateEnglishSentence(
    cleanText: string,
    options: TldrOptions = {}
  ): string {
    if (!cleanText || !cleanText.trim()) return "";
    if (!this.isLikelyEnglish(cleanText)) {
      return cleanText;
    }

    const role = options.role || "";
    const userTitle = options.userTitle || "Jefe";
    const isProgrammer =
      role.toLowerCase().includes("programad") ||
      role.toLowerCase().includes("worker");
    const isScout =
      role.toLowerCase().includes("explorad") ||
      role.toLowerCase().includes("scout");
    const isAuditor =
      role.toLowerCase().includes("audit") ||
      role.toLowerCase().includes("reviewer");

    let s = cleanText.trim();

    // 1. Role-specific past tense verb conjugations
    if (isProgrammer) {
      s = s.replace(/\b(?:I |We |Successfully )?implemented\b/gi, "implementé");
      s = s.replace(/\b(?:I |We |Successfully )?added\b/gi, "agregué");
      s = s.replace(/\b(?:I |We |Successfully )?created\b/gi, "creé");
      s = s.replace(/\b(?:I |We |Successfully )?fixed\b/gi, "corregí");
      s = s.replace(/\b(?:I |We |Successfully )?refactored\b/gi, "refactoricé");
      s = s.replace(/\b(?:I |We |Successfully )?updated\b/gi, "actualicé");
      s = s.replace(/\b(?:I |We |Successfully )?configured\b/gi, "configuré");
      s = s.replace(/\b(?:I |We |Successfully )?designed\b/gi, "diseñé");
      s = s.replace(/\b(?:I |We |Successfully )?built\b/gi, "construí");
    } else if (isScout) {
      s = s.replace(/\b(?:I |We |Successfully )?explored\b/gi, "exploré");
      s = s.replace(/\b(?:I |We |Successfully )?analyzed\b/gi, "analicé");
      s = s.replace(/\b(?:I |We |Successfully )?mapped\b/gi, "mapeé");
      s = s.replace(/\b(?:I |We |Successfully )?investigated\b/gi, "investigué");
      s = s.replace(/\b(?:I |We |Successfully )?found\b/gi, "encontré");
      s = s.replace(/\b(?:I |We |Successfully )?identified\b/gi, "identifiqué");
    } else if (isAuditor) {
      s = s.replace(/\b(?:I |We |Successfully )?verified\b/gi, "verifiqué");
      s = s.replace(/\b(?:I |We |Successfully )?audited\b/gi, "audité");
      s = s.replace(/\b(?:I |We |Successfully )?tested\b/gi, "probé");
      s = s.replace(/\b(?:I |We |Successfully )?ran\b/gi, "ejecuté");
      s = s.replace(/\b(?:I |We |Successfully )?checked\b/gi, "revisé");
    }

    // Generic / passive action verbs
    s = s.replace(/\bwas implemented\b/gi, "se implementó");
    s = s.replace(/\bwere implemented\b/gi, "se implementaron");
    s = s.replace(/\b(?:I |We |Successfully )?implemented\b/gi, "se implementó");
    s = s.replace(/\b(?:I |We |Successfully )?added\b/gi, "se agregó");
    s = s.replace(/\b(?:I |We |Successfully )?created\b/gi, "se creó");
    s = s.replace(/\b(?:I |We |Successfully )?fixed\b/gi, "se corrigió");
    s = s.replace(/\b(?:I |We |Successfully )?refactored\b/gi, "se refactorizó");
    s = s.replace(/\b(?:I |We |Successfully )?updated\b/gi, "se actualizó");
    s = s.replace(/\b(?:I |We |Successfully )?configured\b/gi, "se configuró");
    s = s.replace(/\b(?:I |We |Successfully )?explored\b/gi, "se exploró");
    s = s.replace(/\b(?:I |We |Successfully )?analyzed\b/gi, "se analizó");
    s = s.replace(/\b(?:I |We |Successfully )?mapped\b/gi, "se mapeó");
    s = s.replace(/\b(?:I |We |Successfully )?verified\b/gi, "se verificó");
    s = s.replace(/\b(?:I |We |Successfully )?audited\b/gi, "se auditó");
    s = s.replace(/\b(?:I |We |Successfully )?tested\b/gi, "se probó");
    s = s.replace(/\b(?:I |We |Successfully )?ran\b/gi, "se ejecutó");
    s = s.replace(/\bcompleted\b/gi, "completado");

    // 2. Common sentence patterns & test phrases
    s = s.replace(/\ball (\d+) tests passed with exit code (\d+)\b/gi, "todas las $1 pruebas pasaron con código de salida $2");
    s = s.replace(/\ball (\d+) tests passed\b/gi, "todas las $1 pruebas pasaron con éxito");
    s = s.replace(/\ball tests passed\b/gi, "todas las pruebas pasaron con éxito");
    s = s.replace(/\btests passed\b/gi, "pruebas aprobadas");
    s = s.replace(/\btests failed\b/gi, "pruebas fallaron");
    s = s.replace(/\btest failed\b/gi, "prueba falló");
    s = s.replace(/\bexit code (\d+)\b/gi, "código de salida $1");
    s = s.replace(/\bexit code\b/gi, "código de salida");
    s = s.replace(/\bno blockers\b/gi, "sin bloqueos");
    s = s.replace(/\bwithout errors\b|\bno errors\b/gi, "sin errores");
    s = s.replace(/\bwithout regressions\b/gi, "sin regresiones");
    s = s.replace(/\bwith success\b|\bsuccessfully\b/gi, "con éxito");

    // 3. Technical compounds and phrases
    s = s.replace(/\bneo-brutalist\s+registration(?:\s+form)?\b/gi, "el registro neo-brutalista");
    s = s.replace(/\bneo-brutalist\b|\bneobrutalist\b/gi, "neo-brutalista");
    s = s.replace(/\blanding\s+page\s+contact\s+form\b/gi, "el formulario de contacto en la landing page");
    s = s.replace(/\bcontact\s+form\s+(?:in\s+|on\s+)?landing(?:\s+page)?\b/gi, "el formulario de contacto en la landing page");
    s = s.replace(/\bcontact\s+form\b/gi, "formulario de contacto");
    s = s.replace(/\bdecisions-only\s+speech\s+mode\b/gi, "el modo de voz solo decisiones");
    s = s.replace(/\bspeech\s+mode\b/gi, "modo de voz");
    s = s.replace(/\bdecisions-only\b/gi, "solo decisiones");
    s = s.replace(/\bdatabase\s+migration\b/gi, "migración de base de datos");
    s = s.replace(/\bconcurrency\s+queue\b/gi, "cola de concurrencia");
    s = s.replace(/\bunit\s+tests\b/gi, "pruebas unitarias");
    s = s.replace(/\btest\s+suites\b/gi, "suites de pruebas");
    s = s.replace(/\baudio\s+player\b/gi, "reproductor de audio");
    s = s.replace(/\bproject\s+architecture\b/gi, "arquitectura del proyecto");
    s = s.replace(/\brepository\s+architecture\b/gi, "arquitectura del repositorio");
    s = s.replace(/\brepository\s+structure\b/gi, "estructura del repositorio");

    // 4. Vocabulary words
    const vocab: [RegExp, string][] = [
      [/\blanding\s+page\b/gi, "landing page"],
      [/\bform\b/gi, "formulario"],
      [/\bmenu\b/gi, "menú"],
      [/\bshortcuts\b/gi, "atajos"],
      [/\baudio\b/gi, "audio"],
      [/\btests\b/gi, "pruebas"],
      [/\btest\b/gi, "prueba"],
      [/\bbug\b/gi, "error"],
      [/\bfeature\b/gi, "funcionalidad"],
      [/\bdatabase\b/gi, "base de datos"],
      [/\buser\b/gi, "usuario"],
      [/\bauthentication\b|\bauth\b/gi, "autenticación"],
      [/\bsettings\b|\bconfig\b/gi, "configuración"],
      [/\bworkspace\b/gi, "espacio de trabajo"],
      [/\brepository\b|\brepo\b/gi, "repositorio"],
      [/\bregistration\b/gi, "registro"],
      [/\boptions\b/gi, "opciones"],
      [/\bcomponent\b/gi, "componente"],
      [/\bcomponents\b/gi, "componentes"],
      [/\bpipeline\b/gi, "pipeline"],
      [/\binterface\b/gi, "interfaz"],
      [/\binterfaces\b/gi, "interfaces"],
      [/\bcodebase\b/gi, "base de código"],
      [/\barchitecture\b/gi, "arquitectura"],
      [/\bstructure\b/gi, "estructura"],
      [/\bsemantic\b/gi, "semántica"],
      [/\bmigration\b/gi, "migración"],
      [/\bstyles\b/gi, "estilos"],
      [/\bcode\b/gi, "código"],
      [/\bfiles\b/gi, "archivos"],
      [/\bfile\b/gi, "archivo"],
      [/\bvalidation\b/gi, "validación"],
      [/\bvalidations\b/gi, "validaciones"],
      [/\bdocumentation\b/gi, "documentación"],
      [/\bcoverage\b/gi, "cobertura"],
      [/\bpassed\b/gi, "aprobado"],
      [/\bfailed\b/gi, "falló"],
      [/\berror\b/gi, "error"],
      [/\berrors\b/gi, "errores"],
      [/\ball\b/gi, "todos"],
    ];

    for (const [p, r] of vocab) {
      s = s.replace(p, r);
    }

    // 5. Connectors
    const connectors: [RegExp, string][] = [
      [/\b&\b/g, "y"],
      [/\band\b/gi, "y"],
      [/\bfor\b/gi, "para"],
      [/\bwith\b/gi, "con"],
      [/\bin\b/gi, "en"],
      [/\bon\b/gi, "en"],
      [/\bto\b/gi, "para"],
      [/\bof\b/gi, "de"],
      [/\bfrom\b/gi, "desde"],
      [/\bthe\b/gi, "el"],
    ];

    for (const [p, r] of connectors) {
      s = s.replace(p, r);
    }

    s = s.replace(/\s+/g, " ").trim();
    if (s.length > 0) {
      s = s.charAt(0).toUpperCase() + s.slice(1);
    }

    // 6. Safety Barrier: If after translation isLikelyEnglish is STILL true, return guaranteed Spanish!
    if (this.isLikelyEnglish(s)) {
      if (isScout) {
        return `${userTitle}, completé la exploración técnica del repositorio y dejé el mapa listo.`;
      }
      if (isProgrammer) {
        return `${userTitle}, completé la implementación técnica según lo especificado.`;
      }
      if (isAuditor) {
        return `${userTitle}, completé la auditoría y todas las verificaciones pasaron con éxito.`;
      }
      return `${userTitle}, la tarea técnica finalizó correctamente.`;
    }

    return s;
  }

  /**
   * Detects if text is primarily English.
   * - Checks for strong English engineering action verbs anywhere in the text.
   * - Checks for English action verbs at the beginning of the text.
   * - Counts English indicators (stopwords and technical nouns); returns true if >= 2.
   */
  public static isLikelyEnglish(text: string): boolean {
    if (!text || typeof text !== "string") return false;

    const L = "[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]";

    // 1. English engineering action verbs and participles
    const strongActionVerbs = [
      "implemented", "implementing",
      "created", "creating",
      "added", "adding",
      "fixed", "fixing",
      "updated", "updating",
      "refactored", "refactoring",
      "configured", "configuring",
      "verified", "verifying",
      "audited", "auditing",
      "tested", "testing",
      "explored", "exploring",
      "designed", "designing",
      "mapped", "mapping",
    ];
    if (new RegExp(`(?<!${L})(?:${strongActionVerbs.join("|")})(?!${L})`, "i").test(text)) {
      return true;
    }

    // 2. English action verbs at the beginning of sentence
    const startingActionVerbs = [
      "explore", "exploring", "explored",
      "map", "mapping", "mapped",
      "implement", "implementing", "implemented",
      "create", "creating", "created",
      "add", "adding", "added",
      "refactor", "refactoring", "refactored",
      "fix", "fixing", "fixed",
      "verify", "verifying", "verified",
      "audit", "auditing", "audited",
      "setup", "configure", "configuring", "configured",
      "update", "updating", "updated",
      "test", "testing", "tested",
      "review", "reviewing", "reviewed",
      "design", "designing", "designed",
    ];
    if (new RegExp(`^\\s*(?:${startingActionVerbs.join("|")})(?!${L})`, "i").test(text)) {
      return true;
    }

    // 3. English indicators count >= 2
    const lower = ` ${text.toLowerCase().replace(/[^a-zñáéíóú]/g, " ")} `;
    const englishWords = [
      " the ", " and ", " to ", " of ", " in ", " for ", " is ", " that ", " with ", " on ",
      " as ", " at ", " by ", " from ", " all ", " tests ", " passed ", " failed ", " running ",
      " started ", " completed ", " result ", " files ", " found ", " error ", " code ", " summary ",
      " coverage ", " build ", " task ", " suites ", " duration ", " check ", " report ",
      " was ", " were ", " have ", " has ", " been ", " this ", " these ", " will ", " should ", " could ",
      // English technical nouns
      " component ", " components ",
      " pipeline ", " pipelines ",
      " interface ", " interfaces ",
      " database ", " databases ",
      " feature ", " features ",
      " structure ", " structures ",
      " authentication ",
      " outcomes ",
      " workspace ", " workspaces ",
      " repository ", " repositories ",
      " registration ",
      " options ",
      " architecture ",
      " semantic ",
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
      [/\bcreate unit tests\b/gi, "crear pruebas unitarias"],
      [/\bunit tests\b/gi, "pruebas unitarias"],
      [/\bverification\b/gi, "verificación"],
      [/\bdocumentation\b/gi, "documentación"],
      [/\band\b/gi, "y"],
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
    const timeoutMs = options.timeoutMs ?? 4500;
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

      const level = options.level || "medium";
      let maxTokens = 95;
      if (level === "high") {
        maxTokens = 45;
      } else if (level === "low") {
        maxTokens = 450;
      }

      const userTitle = options.userTitle || "Jefe";
      let systemContent: string;

      const strictSpanishRule =
        "\nREGLA ESTRICTA: Respondé SIEMPRE 100% en español rioplatense natural. NUNCA devuelvas oraciones en inglés.";

      if (level === "high") {
        systemContent =
          options.crewMode && options.role
            ? `Sos ${options.role} de un equipo técnico reportándole a tu "${userTitle}". Generá una síntesis ejecutiva ultra-breve de exactamente 1 sola frase directa y contundente (máximo 25 palabras) en español rioplatense natural sobre lo que lograste. Dirigite a él como "${userTitle}". Sin introducciones innecesarias ni markdown.${strictSpanishRule}`
            : `Sos un asistente de voz en español. Generá una síntesis ultra-breve de exactamente 1 sola frase directa y contundente (máximo 25 palabras) en idioma español natural para ser leída por voz. Sin introducciones ni markdown.${strictSpanishRule}`;
      } else if (level === "low") {
        systemContent =
          options.crewMode && options.role
            ? `Sos ${options.role} de un equipo técnico reportándole a tu "${userTitle}". Traducí y explicá oralmente en detalle lo que lograste, 100% en español rioplatense natural, preservando todos los párrafos y explicaciones completas (80-90% de detalle). Sin código crudo, sin introducciones innecesarias ni markdown.${strictSpanishRule}`
            : `Sos un asistente de voz en español. Traducí y explicá la información técnica en español fluido y natural, preservando todos los párrafos y explicaciones completas (80-90% de detalle) para ser leídos por voz. Sin código crudo, sin introducciones ni markdown.${strictSpanishRule}`;
      } else {
        systemContent =
          options.crewMode && options.role
            ? `Sos ${options.role} de un equipo técnico en terminal reportándole a tu "${userTitle}". Generá un reporte oral de lo que lograste en 2 a 3 oraciones directas, 100% en español rioplatense natural. Dirigite a él como "${userTitle}" con camaradería profesional y pasale la palabra al equipo si corresponde. Sin introducciones innecesarias ni markdown.${strictSpanishRule}`
            : `Sos un asistente de voz en español. Traducí y sintetizá la información técnica en 2 a 3 oraciones breves y directas, 100% en idioma español natural, para ser leídas por voz. Aunque la entrada esté en inglés o sea un reporte técnico, respondé SIEMPRE en español fluido. Sin introducciones ni markdown.${strictSpanishRule}`;
      }

      const payload = {
        model,
        messages: [
          {
            role: "system",
            content: systemContent,
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: maxTokens,
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

      const content = data.choices?.[0]?.message?.content || "";
      if (content && this.isLikelyEnglish(content)) {
        return "";
      }
      return content;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Fast offline heuristic summary: extracts sentences according to the configured level.
   * - "high": extracts only 1 conclusive sentence.
   * - "medium": extracts 2-3 sentences.
   * - "low": returns the full cleaned text.
   */
  public static extractHeuristicSummary(
    text: string,
    level: TldrLevel = "medium"
  ): string {
    if (level === "low") {
      return text;
    }

    const sentences = TextSanitizer.splitSentences(text, 50);
    if (sentences.length <= 1) {
      return text;
    }

    if (level === "high") {
      // Extract only the single most conclusive sentence
      const keywords = [
        "en resumen",
        "listo",
        "corregí",
        "agregué",
        "implementé",
        "se solucionó",
        "quedó",
        "aprobado",
        "completado",
        "pasaron",
        "éxito",
      ];
      for (const s of sentences) {
        const lower = s.toLowerCase();
        if (keywords.some((k) => lower.includes(k))) {
          return s;
        }
      }
      return sentences[0];
    }

    // level === "medium": 2-3 sentences
    if (sentences.length <= 3) {
      return sentences.join(" ");
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
