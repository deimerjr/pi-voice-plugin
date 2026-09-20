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
});
