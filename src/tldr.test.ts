import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TldrSummarizer } from "./tldr.ts";

describe("TldrSummarizer", () => {
  it("returns short text untouched", async () => {
    const shortText = "Esta es una respuesta muy corta.";
    const result = await TldrSummarizer.summarize(shortText);
    assert.equal(result, shortText);
  });

  it("detects English technical text and applies translation", () => {
    assert.equal(
      TldrSummarizer.isLikelyEnglish("All 36 tests passed with exit code 0."),
      true
    );
    assert.equal(
      TldrSummarizer.isLikelyEnglish("Todos los tests pasaron correctamente."),
      false
    );

    const translated = TldrSummarizer.quickTranslateCommonEnglish(
      "Technical verification evidence: All 36 tests passed. Exit code 0."
    );
    assert.ok(translated.includes("todos los 36 tests pasaron con éxito"));
    assert.ok(translated.includes("código de salida"));
  });

  it("extractHeuristicSummary handles low, medium, and high levels correctly", () => {
    const multiSentence = [
      "Iniciamos la refactorización completa del módulo de audio y síntesis.",
      "Se actualizaron todas las dependencias y se corrigieron los errores de tipado.",
      "En resumen, todos los tests pasaron exitosamente sin regresiones.",
      "Quedó pendiente la documentación para la próxima iteración.",
    ].join(" ");

    // low: preserves full text
    const lowResult = TldrSummarizer.extractHeuristicSummary(multiSentence, "low");
    assert.equal(lowResult, multiSentence);

    // high: extracts single most conclusive sentence (keyword matched)
    const highResult = TldrSummarizer.extractHeuristicSummary(multiSentence, "high");
    assert.ok(highResult.includes("En resumen, todos los tests pasaron exitosamente"));
    assert.ok(!highResult.includes("Iniciamos la refactorización"));

    // high fallback: if no keyword, returns first sentence only
    const noKeyword = "Primera oración sobre arquitectura. Segunda oración sobre despliegue. Tercera oración sobre monitoreo.";
    const highNoKeyword = TldrSummarizer.extractHeuristicSummary(noKeyword, "high");
    assert.equal(highNoKeyword, "Primera oración sobre arquitectura.");

    // medium: extracts 2-3 sentences (first + conclusive)
    const medResult = TldrSummarizer.extractHeuristicSummary(multiSentence, "medium");
    assert.ok(medResult.includes("Iniciamos la refactorización"));
    assert.ok(medResult.includes("En resumen, todos los tests pasaron"));
  });

  it("summarize respects low, medium, and high levels", async () => {
    const spanishLongText = [
      "Procedimos con la inspección profunda de todos los subsistemas del plugin de voz.",
      "Se encontraron tres áreas críticas de mejora en la coordinación entre terminales concurrentes.",
      "Implementé los mecanismos de cerrojos atómicos mediante tickets temporales lexicográficos en disco.",
      "Esto asegura que ninguna sesión pise a otra durante la reproducción de audio por el parlante.",
      "Adicionalmente, se configuraron los filtros de código para omitir bloques crudos de sintaxis.",
    ].join(" ");

    // low level: returns full clean text in Spanish without truncation
    const lowSummary = await TldrSummarizer.summarize(spanishLongText, { level: "low", timeoutMs: 1 });
    assert.ok(lowSummary.includes("Procedimos con la inspección"));
    assert.ok(lowSummary.includes("Adicionalmente, se configuraron"));

    // high level: extracts 1 punchy conclusive sentence
    const highSummary = await TldrSummarizer.summarize(spanishLongText, { level: "high", timeoutMs: 1 });
    assert.ok(highSummary.includes("Implementé los mecanismos de cerrojos"));
    assert.ok(!highSummary.includes("Procedimos con la inspección"));

    // medium level (default): extracts 2-3 sentences
    const medSummary = await TldrSummarizer.summarize(spanishLongText, { level: "medium", timeoutMs: 1 });
    assert.ok(medSummary.includes("Procedimos con la inspección"));
    assert.ok(medSummary.includes("Implementé los mecanismos"));
  });

  it("isLikelyEnglish detects action verbs, participles, and technical nouns", () => {
    assert.equal(
      TldrSummarizer.isLikelyEnglish("Implemented Neo-Brutalist Registration"),
      true
    );
    assert.equal(
      TldrSummarizer.isLikelyEnglish("Refactored audio player"),
      true
    );
    assert.equal(
      TldrSummarizer.isLikelyEnglish("Configured database pipeline and authentication interface"),
      true
    );
    assert.equal(
      TldrSummarizer.isLikelyEnglish("Implementé el registro neo-brutalista"),
      false
    );
    assert.equal(
      TldrSummarizer.isLikelyEnglish("Refactoricé el reproductor de audio"),
      false
    );
    assert.equal(
      TldrSummarizer.isLikelyEnglish("Se configuró la base de datos y la interfaz"),
      false
    );
  });

  it("extractSubagentOutcome extracts from YAML summary and Markdown ## Summary", () => {
    const yamlOutput = `
status: completed
summary: "Implemented contact form in landing page with validations."
files_changed:
  - landing/app.js: added validation
`;
    assert.equal(
      TldrSummarizer.extractSubagentOutcome(yamlOutput),
      "Implemented contact form in landing page with validations."
    );

    const mdOutput = `
# Reporte Técnico

## Summary
Refactored audio player to support gapless playback.

## Changes
- Updated player.ts
`;
    assert.equal(
      TldrSummarizer.extractSubagentOutcome(mdOutput),
      "Refactored audio player to support gapless playback."
    );

    const plainOutput = "Simple single sentence output without headers.";
    assert.equal(
      TldrSummarizer.extractSubagentOutcome(plainOutput),
      "Simple single sentence output without headers."
    );
  });

  it("translateTaskLabel converts task labels and preserves Spanish labels", () => {
    assert.equal(
      TldrSummarizer.translateTaskLabel("map landing page contact form"),
      "explorar el formulario de contacto en la landing page"
    );
    assert.equal(
      TldrSummarizer.translateTaskLabel("implement contact form in landing"),
      "implementar el formulario de contacto en la landing page"
    );
    assert.equal(
      TldrSummarizer.translateTaskLabel("audit contact form landing"),
      "auditar el formulario de contacto en la landing page"
    );
    assert.equal(
      TldrSummarizer.translateTaskLabel("explore decisions-only speech mode"),
      "explorar el modo de voz solo decisiones"
    );
    assert.equal(
      TldrSummarizer.translateTaskLabel("Setup database migration"),
      "configurar migración de base de datos"
    );

    // Spanish labels remain preserved without corruption
    const spanishLabels = [
      "explorar el terreno",
      "implementar cerrojos atómicos",
      "auditar y correr las pruebas",
      "configurar base de datos",
      "formulario de contacto en la landing page",
      "crear pruebas unitarias y verificación",
    ];
    for (const label of spanishLabels) {
      assert.equal(TldrSummarizer.translateTaskLabel(label), label);
    }
  });

  it("translateEnglishSentence conjugates by role and enforces safety barrier", () => {
    // Programador (Alex)
    const progResult = TldrSummarizer.translateEnglishSentence(
      "Implemented Neo-Brutalist Registration and updated styles.",
      { role: "Programador" }
    );
    assert.ok(progResult.includes("Implementé"));
    assert.equal(TldrSummarizer.isLikelyEnglish(progResult), false);

    // Exploradora (Dora)
    const scoutResult = TldrSummarizer.translateEnglishSentence(
      "Explored repository structure and mapped files.",
      { role: "Exploradora" }
    );
    assert.ok(scoutResult.includes("Exploré"));
    assert.equal(TldrSummarizer.isLikelyEnglish(scoutResult), false);

    // Auditor (Santa)
    const auditResult = TldrSummarizer.translateEnglishSentence(
      "Verified all unit tests and audited code.",
      { role: "Auditor" }
    );
    assert.ok(auditResult.includes("Verifiqué"));
    assert.equal(TldrSummarizer.isLikelyEnglish(auditResult), false);

    // Safety barrier activation for unrecognized English input
    const untranslatable = "Testing and verifying unexpected components in running build.";
    const safeProg = TldrSummarizer.translateEnglishSentence(untranslatable, {
      role: "Programador",
      userTitle: "Comandante",
    });
    assert.equal(
      safeProg,
      "Comandante, completé la implementación técnica según lo especificado."
    );

    const safeScout = TldrSummarizer.translateEnglishSentence(untranslatable, {
      role: "Exploradora",
      userTitle: "Jefa",
    });
    assert.equal(
      safeScout,
      "Jefa, completé la exploración técnica del repositorio y dejé el mapa listo."
    );

    const safeAudit = TldrSummarizer.translateEnglishSentence(untranslatable, {
      role: "Auditor",
      userTitle: "Jefe",
    });
    assert.equal(
      safeAudit,
      "Jefe, completé la auditoría y todas las verificaciones pasaron con éxito."
    );
  });

  it("summarize with English input and disabled/timed-out LLM produces 100% Spanish output", async () => {
    const englishReport = `
status: completed
summary: "Implemented contact form in landing page and verified unit tests."
files_changed:
  - landing/app.js: updated
`;
    const result = await TldrSummarizer.summarize(englishReport, {
      role: "Programador",
      userTitle: "Jefe",
      timeoutMs: 1, // forces timeout fallback
    });

    assert.ok(result.length > 0);
    assert.equal(TldrSummarizer.isLikelyEnglish(result), false);
    assert.ok(
      result.includes("Implementé") ||
      result.includes("implementé") ||
      result.includes("implementación")
    );
  });
});
