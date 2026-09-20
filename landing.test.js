import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Landing Page Structure & Neo-Brutalist Assets", () => {
  const htmlPath = path.join(__dirname, "index.html");
  const cssPath = path.join(__dirname, "styles.css");
  const jsPath = path.join(__dirname, "app.js");

  it("ensures all core landing page files exist", () => {
    assert.ok(fs.existsSync(htmlPath), "index.html must exist in landing/");
    assert.ok(fs.existsSync(cssPath), "styles.css must exist in landing/");
    assert.ok(fs.existsSync(jsPath), "app.js must exist in landing/");
  });

  describe("HTML Architecture (index.html)", () => {
    const html = fs.readFileSync(htmlPath, "utf-8");

    it("has valid HTML5 doctype, language, and responsive viewport", () => {
      assert.match(html, /<!DOCTYPE\s+html>/i);
      assert.match(html, /<html\s+lang="es">/i);
      assert.match(html, /<meta\s+name="viewport"/i);
      assert.match(html, /<meta\s+charset="UTF-8"/i);
    });

    it("includes proper page title and meta description", () => {
      assert.match(html, /<title>.*PI VOICE PLUGIN.*<\/title>/i);
      assert.match(html, /<meta\s+name="description"/i);
    });

    it("links styles.css and app.js scripts", () => {
      assert.match(html, /<link\s+rel="stylesheet"\s+href="styles\.css"/i);
      assert.match(html, /<script\s+src="app\.js"><\/script>/i);
    });

    it("defines essential semantic navigation and sections", () => {
      assert.match(html, /<header\s+class="navbar-wrapper">/i);
      assert.match(html, /<nav\s+class="navbar/i);
      assert.match(html, /id="cuadrilla"/i);
      assert.match(html, /id="features"/i);
      assert.match(html, /id="tui-simulator"/i);
      assert.match(html, /id="pipeline"/i);
      assert.match(html, /id="comandos"/i);
      assert.match(html, /id="install"/i);
      assert.match(html, /<footer\s+class="footer-wrapper">/i);
    });

    it("contains the 4 Cuadrilla agents with data-agent attributes", () => {
      assert.match(html, /data-agent="gentleman"/);
      assert.match(html, /data-agent="dora"/);
      assert.match(html, /data-agent="alex"/);
      assert.match(html, /data-agent="santa"/);
    });

    it("contains quickstart installation snippet and copy button", () => {
      assert.match(html, /id="cmd-install"/);
      assert.match(html, /id="btn-copy-install"/);
    });

    it("contains TUI interactive simulator buttons", () => {
      assert.match(html, /id="sim-btn-voice"/);
      assert.match(html, /id="sim-btn-stop"/);
      assert.match(html, /id="sim-btn-volume"/);
      assert.match(html, /id="sim-btn-record"/);
    });

    it("contains the dark matrix theme toggle button", () => {
      assert.match(html, /id="btn-theme-toggle"/);
    });
  });

  describe("Neo-Brutalist CSS Design Tokens (styles.css)", () => {
    const css = fs.readFileSync(cssPath, "utf-8");

    it("defines the high-contrast neo-brutalist color palette", () => {
      assert.match(css, /--c-yellow:\s*#ffe600/i);
      assert.match(css, /--c-cyan:\s*#00f0ff/i);
      assert.match(css, /--c-green:\s*#00ff66/i);
      assert.match(css, /--c-pink:\s*#ff0055/i);
      assert.match(css, /--c-black:\s*#0a0a0a/i);
    });

    it("defines hard borders and hard offset box-shadows", () => {
      assert.match(css, /--border-thick:\s*4px\s+solid/i);
      assert.match(css, /--shadow-hard:\s*5px\s+5px\s+0px/i);
    });

    it("implements marquee animation with infinite linear track", () => {
      assert.match(css, /@keyframes\s+marquee/i);
      assert.match(css, /animation:\s*marquee\s+28s\s+linear\s+infinite/i);
    });

    it("includes responsive media queries for tablet and mobile devices", () => {
      assert.match(css, /@media\s*\(\s*max-width:\s*900px\s*\)/i);
      assert.match(css, /@media\s*\(\s*max-width:\s*600px\s*\)/i);
    });

    it("defines dark matrix theme styles", () => {
      assert.match(css, /body\.dark-mode/);
      assert.match(css, /--bg-canvas:\s*#0a0a0c/i);
    });
  });

  describe("Interactivity & Cuadrilla Data (app.js)", () => {
    const js = fs.readFileSync(jsPath, "utf-8");

    it("defines CUADRILLA_DATA with all 4 agent personas", () => {
      assert.match(js, /CUADRILLA_DATA\s*=\s*\{/);
      assert.match(js, /gentleman:\s*\{/);
      assert.match(js, /dora:\s*\{/);
      assert.match(js, /alex:\s*\{/);
      assert.match(js, /santa:\s*\{/);
    });

    it("configures appropriate voice metadata and Spanish quotes for each agent", () => {
      assert.match(js, /voiceName:\s*"dora_heart"/);
      assert.match(js, /voiceName:\s*"ef_dora"/);
      assert.match(js, /voiceName:\s*"em_alex"/);
      assert.match(js, /voiceName:\s*"em_santa"/);
      assert.match(js, /Jefe/);
    });

    it("implements Web Audio API and Web Speech API synthesis methods", () => {
      assert.match(js, /AudioContext/);
      assert.match(js, /playRetroTone/);
      assert.match(js, /speechSynthesis/);
      assert.match(js, /SpeechSynthesisUtterance/);
      assert.match(js, /playCuadrillaChain/);
    });

    it("handles theme toggle logic and persistence", () => {
      assert.match(js, /btn-theme-toggle/);
      assert.match(js, /dark-mode/);
      assert.match(js, /pi_voice_theme/);
    });
  });

  describe("Neural Audio Assets (landing/audio/)", () => {
    const audioDir = path.join(__dirname, "audio");
    const requiredAudios = [
      "gentleman.wav",
      "dora.wav",
      "alex.wav",
      "santa.wav",
      "test-engine.wav",
    ];

    it("verifies all 5 authentic Kokoro audio files exist", () => {
      for (const file of requiredAudios) {
        const filePath = path.join(audioDir, file);
        assert.ok(fs.existsSync(filePath), `${file} must exist in landing/audio/`);
      }
    });

    it("ensures each audio file is valid RIFF/WAVE PCM audio format", () => {
      for (const file of requiredAudios) {
        const filePath = path.join(audioDir, file);
        const stats = fs.statSync(filePath);
        assert.ok(stats.size > 10000, `${file} must be at least 10KB`);

        const buffer = fs.readFileSync(filePath);
        const header = buffer.subarray(0, 12).toString("binary");
        assert.ok(header.startsWith("RIFF"), `${file} must start with RIFF header`);
        assert.ok(header.includes("WAVE"), `${file} must contain WAVE format identifier`);
      }
    });

    it("ensures landing/app.js references authentic audio files", () => {
      const js = fs.readFileSync(jsPath, "utf-8");
      assert.match(js, /audio\/gentleman\.wav/);
      assert.match(js, /audio\/dora\.wav/);
      assert.match(js, /audio\/alex\.wav/);
      assert.match(js, /audio\/santa\.wav/);
      assert.match(js, /audio\/test-engine\.wav/);
    });
  });
});
