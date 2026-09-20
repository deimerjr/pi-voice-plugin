import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TldrSummarizer } from "./tldr.ts";

describe("TldrSummarizer", () => {
  it("returns short text untouched", async () => {
    const shortText = "Esta es una respuesta muy corta.";
    const result = await TldrSummarizer.summarize(shortText);
    assert.equal(result, shortText);
  });

  it("extracts heuristic summary for long text when offline", () => {
    const longText = `
Eran las tres de la mañana y la terminal parpadeaba como un faro solitario en medio del departamento a oscuras.
Martín miraba el diff en la pantalla, convencido de que los duendes del compilador le estaban jugando una mala pasada.
El mate ya estaba lavado hacía rato, pero la yerba tibia todavía le servía de amuleto contra el sueño.
Listo, se solucionó el problema al corregir la variable de entorno mal configurada.
`;

    const summary = TldrSummarizer.extractHeuristicSummary(longText);
    assert.ok(summary.length < longText.length);
    assert.ok(summary.includes("Listo, se solucionó el problema") || summary.includes("Eran las tres"));
  });
});
