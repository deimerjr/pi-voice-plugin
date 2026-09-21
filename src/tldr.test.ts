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
});
