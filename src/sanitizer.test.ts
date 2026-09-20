import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TextSanitizer } from "./sanitizer.ts";

describe("TextSanitizer", () => {
  it("omits code blocks completely when filterCode is 'omit'", () => {
    const input = `Aquí está la solución:
\`\`\`typescript
function sum(a: number, b: number): number {
  return a + b;
}
\`\`\`
Eso resuelve el problema de suma.`;

    const result = TextSanitizer.sanitize(input, { filterCode: "omit" });
    assert.ok(!result.includes("function sum"));
    assert.ok(!result.includes("```"));
    assert.ok(result.includes("Aquí está la solución:"));
    assert.ok(result.includes("Eso resuelve el problema de suma."));
  });

  it("mentions code block when filterCode is 'mention'", () => {
    const input = `Observá el código:
\`\`\`python
print("hola mundo")
\`\`\`
¿Tiene sentido?`;

    const result = TextSanitizer.sanitize(input, { filterCode: "mention" });
    assert.ok(result.includes("[Bloque de código omitido]"));
    assert.ok(!result.includes('print("hola mundo")'));
    assert.ok(result.includes("Observá el código:"));
    assert.ok(result.includes("¿Tiene sentido?"));
  });

  it("strips markdown symbols like bold, italic, headers, links", () => {
    const input = `# Título Principal
## Subtítulo
Este texto tiene **negrita**, *cursiva*, ~~tachado~~ y un [enlace a Pi](https://pi.dev).
> Una cita textual importante.
* Elemento 1
* Elemento 2`;

    const result = TextSanitizer.sanitize(input);
    assert.ok(!result.includes("#"));
    assert.ok(!result.includes("**"));
    assert.ok(!result.includes("*"));
    assert.ok(!result.includes("https://pi.dev"));
    assert.ok(result.includes("Título Principal"));
    assert.ok(result.includes("enlace a Pi"));
    assert.ok(result.includes("negrita"));
    assert.ok(result.includes("cursiva"));
    assert.ok(result.includes("Una cita textual importante."));
    assert.ok(result.includes("Elemento 1"));
    assert.ok(result.includes("Elemento 2"));
  });

  it("strips leaked <think> reasoning tags", () => {
    const input = `<think>
Pensando en cómo responder al usuario...
Esta es una cadena de razonamiento interna.
</think>
¡Hola! ¿En qué puedo ayudarte hoy?`;

    const result = TextSanitizer.sanitize(input);
    assert.ok(!result.includes("Pensando en cómo responder"));
    assert.ok(!result.includes("<think>"));
    assert.equal(result, "¡Hola! ¿En qué puedo ayudarte hoy?");
  });

  it("caps text at maxChars cleanly", () => {
    const longText = "Esta es una frase repetida para probar longitud. ".repeat(100);
    const result = TextSanitizer.sanitize(longText, { maxChars: 200 });

    assert.ok(result.length <= 260); // includes truncation message
    assert.ok(result.includes("continúa en pantalla"));
  });

  it("handles tables and list formatting cleanly", () => {
    const input = `Tabla comparativa:
| Opción | Velocidad |
| :--- | :--- |
| A | Rápida |
| B | Lenta |

Lista de tareas:
- Tarea uno
- Tarea dos`;

    const result = TextSanitizer.sanitize(input);
    assert.ok(!result.includes("|"));
    assert.ok(!result.includes("---"));
    assert.ok(result.includes("Tabla comparativa:"));
    assert.ok(result.includes("Opción Velocidad"));
    assert.ok(result.includes("Tarea uno"));
    assert.ok(result.includes("Tarea dos"));
  });

  it("splits text into balanced sentence chunks for streaming speech", () => {
    const text = "Primera oración clara. Segunda oración con más detalle. Tercera oración final.";
    const chunks = TextSanitizer.splitSentences(text, 30);

    assert.ok(chunks.length >= 2);
    assert.ok(chunks[0].includes("Primera oración"));
  });
});
