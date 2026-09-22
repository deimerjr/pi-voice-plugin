import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DecisionGate } from "./decision-gate.ts";

describe("DecisionGate", () => {
  describe("stripCodeBlocks", () => {
    it("removes triple-backtick fenced blocks", () => {
      const input = "Texto antes\n```typescript\n// ¿Procedo con esto?\nconst x = 1;\n```\nTexto despues";
      const stripped = DecisionGate.stripCodeBlocks(input);
      assert.ok(!stripped.includes("¿Procedo con esto?"));
      assert.ok(!stripped.includes("const x = 1;"));
      assert.ok(stripped.includes("Texto antes"));
      assert.ok(stripped.includes("Texto despues"));
    });

    it("removes inline code blocks", () => {
      const input = "Revisá la función `shouldProceed()` y decime.";
      const stripped = DecisionGate.stripCodeBlocks(input);
      assert.ok(!stripped.includes("`shouldProceed()`"));
      assert.ok(stripped.includes("Revisá la función"));
    });

    it("handles empty or falsy strings gracefully", () => {
      assert.equal(DecisionGate.stripCodeBlocks(""), "");
      assert.equal(DecisionGate.stripCodeBlocks(null as any), "");
      assert.equal(DecisionGate.stripCodeBlocks(undefined as any), "");
    });
  });

  describe("evaluateAssistantText - Positive cases", () => {
    it("detects Spanish permission requests", () => {
      const cases = [
        "¿Procedo con los cambios?",
        "¿Procedemos con la refactorización?",
        "¿Confirmás la eliminación del archivo temporal?",
        "¿Aprobás este plan de acción?",
        "¿Querés que proceda a aplicar los cambios en el archivo?",
        "¿Querés que elimine el archivo anterior?",
        "Necesito tu autorización para continuar.",
        "Solicito tu permiso para actualizar el paquete.",
        "Por favor confirmá si procedo con la instalación.",
        "Avisame si querés que aplique este commit.",
      ];

      for (const text of cases) {
        const res = DecisionGate.evaluateAssistantText(text);
        assert.equal(
          res.shouldSpeak,
          true,
          `Expected shouldSpeak=true for Spanish permission: "${text}"`
        );
      }
    });

    it("detects Spanish multi-option choices", () => {
      const text = `
He analizado el problema y tenemos dos alternativas. ¿Cuál preferís implementar?
1. Enfoque con SQLite embebido
2. Enfoque con archivos JSON locales
`;
      const res = DecisionGate.evaluateAssistantText(text);
      assert.equal(res.shouldSpeak, true);
      assert.equal(res.reason, "multi_option_choice");
    });

    it("detects Spanish binary choice questions", () => {
      const cases = [
        "¿Preferís usar Jest o Node test runner?",
        "¿Querés que usemos la opción A o la opción B?",
        "¿Vamos con la solución rápida o la solución robusta?",
      ];

      for (const text of cases) {
        const res = DecisionGate.evaluateAssistantText(text);
        assert.equal(
          res.shouldSpeak,
          true,
          `Expected shouldSpeak=true for binary choice: "${text}"`
        );
      }
    });

    it("detects English permission requests", () => {
      const cases = [
        "Should I proceed with the refactoring?",
        "Shall I proceed with applying these changes?",
        "Please confirm before I delete the branch.",
        "Awaiting your confirmation to deploy to staging.",
        "Do you approve this migration plan?",
        "Do you want me to proceed with the database reset?",
        "I require your permission to run this command.",
      ];

      for (const text of cases) {
        const res = DecisionGate.evaluateAssistantText(text);
        assert.equal(
          res.shouldSpeak,
          true,
          `Expected shouldSpeak=true for English permission: "${text}"`
        );
      }
    });

    it("detects English multi-option choices", () => {
      const text = `
There are two ways to solve this. Which option do you prefer?
a) Deploy to staging first
b) Deploy directly to production
`;
      const res = DecisionGate.evaluateAssistantText(text);
      assert.equal(res.shouldSpeak, true);
      assert.equal(res.reason, "multi_option_choice");
    });

    it("detects English binary choices", () => {
      const cases = [
        "Do you prefer option A or option B?",
        "Would you prefer SQLite or PostgreSQL?",
        "Should we use the synchronous or asynchronous method?",
      ];

      for (const text of cases) {
        const res = DecisionGate.evaluateAssistantText(text);
        assert.equal(
          res.shouldSpeak,
          true,
          `Expected shouldSpeak=true for English binary choice: "${text}"`
        );
      }
    });
  });

  describe("evaluateAssistantText - Negative cases", () => {
    it("ignores questions embedded only inside code blocks", () => {
      const text = `
Aquí está el código propuesto:
\`\`\`typescript
// ¿Desea continuar con la ejecución?
const confirm = window.confirm("¿Procedo?");
\`\`\`
El script ya quedó guardado en el archivo correspondiente.
`;
      const res = DecisionGate.evaluateAssistantText(text);
      assert.equal(res.shouldSpeak, false);
    });

    it("rejects pure informational summaries", () => {
      const cases = [
        "Se completaron las pruebas unitarias con 100% de éxito. No hubo errores.",
        "The refactoring is complete. All 15 tests passed cleanly.",
        "Actualicé los tres archivos de configuración y reinicié el proceso en segundo plano.",
        "Los cambios fueron guardados exitosamente.",
      ];

      for (const text of cases) {
        const res = DecisionGate.evaluateAssistantText(text);
        assert.equal(
          res.shouldSpeak,
          false,
          `Expected shouldSpeak=false for informational text: "${text}"`
        );
      }
    });

    it("rejects markdown headings containing questions", () => {
      const text = `
### ¿Cómo se configuran los puertos?
Los puertos se configuran en el archivo .env utilizando la variable PORT.
`;
      const res = DecisionGate.evaluateAssistantText(text);
      assert.equal(res.shouldSpeak, false);
    });

    it("handles empty or invalid inputs cleanly", () => {
      assert.equal(DecisionGate.evaluateAssistantText("").shouldSpeak, false);
      assert.equal(DecisionGate.evaluateAssistantText(null as any).shouldSpeak, false);
      assert.equal(DecisionGate.evaluateAssistantText("   \n\n  ").shouldSpeak, false);
    });
  });

  describe("isDecisionTool", () => {
    it("evaluates question tool accurately", () => {
      const res = DecisionGate.isDecisionTool("question", {
        question: "What is your preferred database?",
      });
      assert.equal(res.shouldSpeak, true);
      assert.equal(res.speakableText, "Pregunta: What is your preferred database?");
    });

    it("evaluates ask_user_choice tool with options list", () => {
      const res = DecisionGate.isDecisionTool("ask_user_choice", {
        question: "Seleccione un entorno",
        choices: ["Staging", "Producción", "Local"],
      });
      assert.equal(res.shouldSpeak, true);
      assert.ok(res.speakableText.startsWith("Pregunta: Seleccione un entorno."));
      assert.ok(res.speakableText.includes("1, Staging"));
      assert.ok(res.speakableText.includes("2, Producción"));
      assert.ok(res.speakableText.includes("3, Local"));
    });

    it("evaluates ask_user_choice tool with object choices", () => {
      const res = DecisionGate.isDecisionTool("ask_user_choice", {
        prompt: "Elija una rama",
        options: [{ label: "main" }, { title: "develop" }],
      });
      assert.equal(res.shouldSpeak, true);
      assert.ok(res.speakableText.includes("1, main"));
      assert.ok(res.speakableText.includes("2, develop"));
    });

    it("evaluates ask_user_confirmation tool", () => {
      const res = DecisionGate.isDecisionTool("ask_user_confirmation", {
        message: "¿Desea sobrescribir el archivo existente?",
      });
      assert.equal(res.shouldSpeak, true);
      assert.equal(
        res.speakableText,
        "Confirmación requerida: ¿Desea sobrescribir el archivo existente?"
      );
    });

    it("evaluates ask_user_question tool", () => {
      const res = DecisionGate.isDecisionTool("ask_user_question", {
        question: "Por favor indique la clave API:",
      });
      assert.equal(res.shouldSpeak, true);
      assert.equal(res.speakableText, "Pregunta: Por favor indique la clave API:");
    });

    it("returns shouldSpeak=false for non-decision tools", () => {
      const nonDecisionTools = [
        { name: "bash", args: { command: "npm test" } },
        { name: "read", args: { path: "src/index.ts" } },
        { name: "write", args: { path: "foo.txt", content: "hello" } },
        { name: "edit", args: { path: "foo.txt" } },
        { name: "todo", args: { action: "write" } },
        { name: "subagent_run", args: { agent: "worker" } },
      ];

      for (const t of nonDecisionTools) {
        const res = DecisionGate.isDecisionTool(t.name, t.args);
        assert.equal(res.shouldSpeak, false);
        assert.equal(res.speakableText, "");
      }
    });

    it("handles null or undefined arguments safely", () => {
      const res = DecisionGate.isDecisionTool("ask_user_confirmation", null);
      assert.equal(res.shouldSpeak, true);
      assert.ok(res.speakableText.includes("Confirmación requerida:"));

      const res2 = DecisionGate.isDecisionTool("", null);
      assert.equal(res2.shouldSpeak, false);
    });
  });
});
