export interface DecisionToolEvaluation {
  shouldSpeak: boolean;
  speakableText: string;
}

export interface TextEvaluation {
  shouldSpeak: boolean;
  reason?: string;
}

export class DecisionGate {
  /**
   * Removes markdown code blocks (fenced and inline) so code comments,
   * signatures or string literals do not trigger false positives.
   */
  public static stripCodeBlocks(text: string): string {
    if (!text) return "";
    return text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`\n]+`/g, " ")
      .trim();
  }

  /**
   * Evaluates assistant text to determine if it is presenting a decision,
   * asking for permission, or offering choices to the user.
   */
  public static evaluateAssistantText(text: string): TextEvaluation {
    if (!text || typeof text !== "string") {
      return { shouldSpeak: false, reason: "empty_or_invalid" };
    }

    // 1. Strip code blocks
    const stripped = DecisionGate.stripCodeBlocks(text);
    if (!stripped.trim()) {
      return { shouldSpeak: false, reason: "code_only" };
    }

    // Remove markdown headers that might contain questions (e.g., "### ¿Por qué este cambio?")
    const contentWithoutHeaders = stripped
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n");

    // 2. Reject self-answered rhetorical questions in the text
    // (e.g., "¿Por qué hacemos esto? Porque mejora el rendimiento." or "Why is this? Because...")
    const rhetoricalPattern =
      /(?:¿|\b)(?:por qu[eé]|why|c[oó]mo|how|qu[eé] significa|what does .* mean)\b[^?\n]*\?\s*(?:porque|because|es decir|it means|significa|funciona|it works)\b/i;

    // Check if entire question context is purely rhetorical
    const hasOnlyRhetoricalQuestions =
      rhetoricalPattern.test(contentWithoutHeaders) &&
      !contentWithoutHeaders.includes("?") &&
      !contentWithoutHeaders.includes("¿");

    // 3. Detect Permission Requests (Spanish & English)
    const permissionPatterns = [
      // Spanish permission / authorization / confirmation
      /\b(?:necesito|requiero|solicito|pido)\s+(?:tu\s+)?(?:permiso|autorizaci[oó]n|confirmaci[oó]n|aprobaci[oó]n)\b/i,
      /\b(?:dame|das|dar[ií]as)\s+(?:el|tu)?\s*(?:permiso|autorizaci[oó]n|confirmaci[oó]n|aprobaci[oó]n|ok|visto bueno|luz verde)\b/i,
      /\b(?:quer[eé]s|quieres|dese[aá]s)\s+que\s+(?:proceda|procedamos|aplique|apliquemos|elimine|eliminemos|borre|borremos|haga|hagamos|avance|avancemos)\b/i,
      /\b(?:confirm[aá]s?|confirmar|aprob[aá]s?|aprobar|autoriz[aá]s?|autorizar)\b.*\?/i,
      /\b(?:por\s+favor\s+)?(?:confirm[aá]s?|confirmar)\s+si\s+(?:procedo|avanzo|aplico|continuo)\b/i,
      /\b(?:procedo|procedemos|continuo|continuamos|avanzamos|confirmo)\s*\?/i,
      /\b(?:procedo|procedemos|continuo|continuamos|avanzamos|confirmo)\b.*\?/i,
      /\b(?:avisame|av[ií]same|decime|dime)\s+si\s+(?:procedo|avanzo|aplico|confirmo|quer[eé]s|quieres)\b/i,
      /\b(?:esperando|a la espera de)\s+(?:tu\s+)?(?:confirmaci[oó]n|autorizaci[oó]n|aprobaci[oó]n|respuesta)\b/i,
      /(?:¿|\b)(?:me\s+das\s+luz\s+verde|luz\s+verde)\s*\?/i,
      /\b(?:autoriz[aá]s|aprob[aá]s|confirm[aá]s)\s+este\s+cambio\b/i,

      // English permission / authorization / confirmation
      /\b(?:need|require|awaiting|waiting for)\s+(?:your\s+)?(?:permission|authorization|approval|confirmation)\b/i,
      /\b(?:please\s+)?confirm\s+(?:if|whether|before)\b/i,
      /\b(?:should|shall|can|may)\s+I\s+(?:proceed|continue|apply|delete|execute|start)\b/i,
      /\b(?:do you\s+)?(?:authorize|approve|confirm)\b.*\?/i,
      /\b(?:do you want me to|would you like me to)\s+(?:proceed|apply|delete|execute|continue)\b/i,
      /\bproceed\s*\?/i,
      /\b(?:shall we|should we)\s+(?:proceed|continue)\b/i,
      /\bawaiting\s+(?:your\s+)?confirmation\b/i,
      /\bdo\s+you\s+approve\s*\?/i,
    ];

    for (const pattern of permissionPatterns) {
      if (pattern.test(contentWithoutHeaders)) {
        return { shouldSpeak: true, reason: "permission_request" };
      }
    }

    // 4. Detect Binary Choice Questions (Spanish & English)
    const binaryChoicePatterns = [
      /(?:¿|\b)(?:prefer[ií]s|prefieres|quer[eé]s|quieres|dese[aá]s)\b[^?\n]+\b(?:o|u)\b[^?\n]+\?/i,
      /(?:¿|\b)(?:would you prefer|do you prefer|should we|should I)\b[^?\n]+\b(?:or)\b[^?\n]+\?/i,
      /(?:¿|\b)(?:vamos con|hacemos|usamos|elegimos)\b[^?\n]+\b(?:o|u)\b[^?\n]+\?/i,
      /(?:¿|\b)(?:opci[oó]n|alternativa|option)\s+[A-Za-z0-9]+\s+(?:o|or)\s+(?:opci[oó]n|alternativa|option)?\s*[A-Za-z0-9]+.*\?/i,
      /[¿?][^?\n]+\b(?:prefer[ií]s|prefieres|quer[eé]s|quieres|do you prefer|would you prefer)\b[^?\n]+\b(?:o|or)\b/i,
      /(?:¿|\b)(?:either\s+[^?\n]+\s+or\s+[^?\n]+)\?/i,
    ];

    for (const pattern of binaryChoicePatterns) {
      if (pattern.test(contentWithoutHeaders)) {
        return { shouldSpeak: true, reason: "binary_choice" };
      }
    }

    // 5. Detect Multi-Option Choices with list structure
    // Numbered lists: "1. ... \n 2. ..." or "1) ... \n 2) ..."
    const numberedMatches = contentWithoutHeaders.match(/^\s*(?:\d+[\.\)]|\(\d+\))\s+\S+/gm) || [];
    // Lettered lists: "a) ... \n b) ..." or "A. ... \n B. ..."
    const letteredMatches = contentWithoutHeaders.match(/^\s*(?:[a-zA-Z][\.\)]|\([a-zA-Z]\))\s+\S+/gm) || [];

    const listCount = numberedMatches.length >= 2 ? numberedMatches.length : letteredMatches.length >= 2 ? letteredMatches.length : 0;

    if (listCount >= 2) {
      // Must be accompanied by choice phrasing
      const choicePhrasing =
        /\b(cu[aá]l|prefer[ií]s|prefieres|eleg[ií]s|eliges|opci[oó]n|opciones|alternativa|alternativas|decid[ií]s|decides|which option|do you prefer|would you prefer|choose|pick|select|which one)\b/i;

      if (choicePhrasing.test(contentWithoutHeaders)) {
        return { shouldSpeak: true, reason: "multi_option_choice" };
      }
    }

    // 6. Check for general direct decision-demanding questions (e.g., "¿Qué opción preferís?", "Which one do you choose?")
    const generalDecisionQuestion =
      /(?:¿|\b)(?:qu[eé]\s+opci[oó]n|qu[eé]\s+camino|cu[aá]l\s+de\s+est[ao]s|which\s+option|which\s+path|what\s+would\s+you\s+like\s+to\s+do)\b.*\?/i;

    if (generalDecisionQuestion.test(contentWithoutHeaders)) {
      return { shouldSpeak: true, reason: "decision_question" };
    }

    return { shouldSpeak: false, reason: "informational_or_no_decision" };
  }

  /**
   * Checks if an invoked tool is an interactive decision tool that requires user input,
   * and formats speakable text for audio synthesis.
   */
  public static isDecisionTool(toolName: string, args: any): DecisionToolEvaluation {
    if (!toolName) {
      return { shouldSpeak: false, speakableText: "" };
    }

    const safeArgs = args || {};

    if (toolName === "ask_user_choice") {
      const question =
        safeArgs.question ||
        safeArgs.prompt ||
        safeArgs.message ||
        "Por favor elija una opción:";

      const choices = safeArgs.choices || safeArgs.options || [];
      let optionsText = "";
      if (Array.isArray(choices) && choices.length > 0) {
        optionsText = " Opciones: " + choices
          .map((c: any, index: number) => {
            const label =
              typeof c === "string"
                ? c
                : c?.label || c?.title || c?.text || JSON.stringify(c);
            return `${index + 1}, ${label}`;
          })
          .join(". ");
      }

      return {
        shouldSpeak: true,
        speakableText: `Pregunta: ${question}.${optionsText}`.trim(),
      };
    }

    if (toolName === "ask_user_confirmation") {
      const msg =
        safeArgs.question ||
        safeArgs.message ||
        safeArgs.prompt ||
        safeArgs.text ||
        "Confirme para continuar:";

      return {
        shouldSpeak: true,
        speakableText: `Confirmación requerida: ${msg}`.trim(),
      };
    }

    if (toolName === "ask_user_question") {
      const q =
        safeArgs.question ||
        safeArgs.prompt ||
        safeArgs.message ||
        "Se requiere su respuesta:";

      return {
        shouldSpeak: true,
        speakableText: `Pregunta: ${q}`.trim(),
      };
    }

    if (toolName === "question") {
      const q =
        safeArgs.question ||
        safeArgs.prompt ||
        safeArgs.text ||
        safeArgs.message ||
        "Se requiere su respuesta:";

      return {
        shouldSpeak: true,
        speakableText: `Pregunta: ${q}`.trim(),
      };
    }

    return { shouldSpeak: false, speakableText: "" };
  }
}
