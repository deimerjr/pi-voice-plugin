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
      assert.match(html, /id="contacto"/i);
      assert.match(html, /<footer\s+class="footer-wrapper">/i);
    });

    it("contains the 4 Cuadrilla agents with data-agent attributes", () => {
      assert.match(html, /data-agent="gentleman"/);
      assert.match(html, /data-agent="dora"/);
      assert.match(html, /data-agent="alex"/);
      assert.match(html, /data-agent="santa"/);
    });

    it("contains the cloned and hybrid voices catalog with data-agent attributes", () => {
      assert.match(html, /id="voces-clonadas"/);
      assert.match(html, /data-agent="juan_carlos"/);
      assert.match(html, /data-agent="valeria"/);
      assert.match(html, /data-agent="fenrir"/);
      assert.match(html, /data-agent="ximena"/);
      assert.match(html, /data-agent="mateo"/);
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

    it("uses custom single-tone brutalist vector icons and avatars without generic emojis", () => {
      assert.match(html, /class="b-avatar-box"/);
      assert.match(html, /class="b-avatar-svg"/);
      assert.match(html, /class="b-icon-inline"/);
      assert.doesNotMatch(html, /[🎙️🎩🧭⚡🛡️⚙️⏹️🔊🔉🔇💡⌨️]/, "No generic emojis allowed");
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

    it("defines styling for single-tone brutalist icons and avatars", () => {
      assert.match(css, /\.b-avatar-box/);
      assert.match(css, /\.b-avatar-svg/);
      assert.match(css, /\.b-icon-inline/);
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

    it("defines ICONS dictionary and avoids generic emojis in UI updates", () => {
      assert.match(js, /ICONS\s*=\s*\{/);
      assert.match(js, /b-icon-inline/);
      assert.doesNotMatch(js, /[🎙️🎩🧭⚡🛡️⚙️⏹️🔊🔉🔇💡⌨️]/, "No generic emojis allowed in app.js");
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
      "juan_carlos.wav",
      "valeria.wav",
      "fenrir.wav",
      "ximena.wav",
      "mateo.wav",
    ];

    it("verifies all 10 authentic Kokoro audio files exist", () => {
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
      assert.match(js, /audio\/juan_carlos\.wav/);
      assert.match(js, /audio\/valeria\.wav/);
      assert.match(js, /audio\/fenrir\.wav/);
      assert.match(js, /audio\/ximena\.wav/);
      assert.match(js, /audio\/mateo\.wav/);
    });
  });

  describe("Integrated Terminal Theater Engine (index.html & app.js)", () => {
    it("ensures index.html contains the full integrated Gentleman-Sexy-Djr terminal theater", () => {
      const html = fs.readFileSync(htmlPath, "utf-8");
      assert.match(html, /class="theater-terminal-wrapper"/);
      assert.match(html, /id="speaker-hud"/);
      assert.match(html, /id="wave-canvas"/);
      assert.match(html, /id="scene-gentleman"/);
      assert.match(html, /id="scene-dora"/);
      assert.match(html, /id="scene-alex"/);
      assert.match(html, /id="scene-santa"/);
      assert.match(html, /id="btn-play-theater"/);
      assert.match(html, /id="btn-restart-theater"/);
      assert.match(html, /id="btn-record-video"/);
      assert.match(html, /Gentleman-Sexy-Djr/);
    });

    it("ensures styles.css defines Gentleman-Sexy-Djr terminal styling", () => {
      const css = fs.readFileSync(cssPath, "utf-8");
      assert.match(css, /\.theater-terminal-wrapper/);
      assert.match(css, /#070508/);
      assert.match(css, /#723C54/);
      assert.match(css, /#FF4F9A/);
      assert.match(css, /#F0D28A/);
      assert.match(css, /#wave-canvas/);
    });

    it("ensures app.js contains unified animation sequencer, analyser and video recorder", () => {
      const js = fs.readFileSync(jsPath, "utf-8");
      assert.match(js, /CUADRILLA_DATA\s*=\s*\{/);
      assert.match(js, /SCENES_ORDER/);
      assert.match(js, /drawWaveform/);
      assert.match(js, /startFullTheater/);
      assert.match(js, /setupVideoRecorder/);
      assert.match(js, /MediaRecorder/);
      assert.match(js, /video\/webm/);
    });
  });

  describe("Neo-Brutalist Registration & Contact Form Architecture", () => {
    const html = fs.readFileSync(htmlPath, "utf-8");
    const css = fs.readFileSync(cssPath, "utf-8");
    const js = fs.readFileSync(jsPath, "utf-8");

    it("verifies #contacto placement in index.html after #install and before footer", () => {
      assert.match(html, /id="contacto"/);
      assert.match(html, /<a href="#contacto">CONTACTO<\/a>/);
      const installIdx = html.indexOf('id="install"');
      const contactIdx = html.indexOf('id="contacto"');
      const footerIdx = html.indexOf('class="footer-wrapper"');

      assert.ok(installIdx !== -1, "#install must exist");
      assert.ok(contactIdx !== -1, "#contacto must exist");
      assert.ok(footerIdx !== -1, "footer must exist");
      assert.ok(contactIdx > installIdx, "#contacto must be placed after #install");
      assert.ok(contactIdx < footerIdx, "#contacto must be placed before footer");
    });

    it("declares form with id='form-contact' and novalidate attribute", () => {
      assert.match(html, /<form\s+id="form-contact"\s+class="brutalist-form"\s+novalidate>/);
    });

    it("contains terminal dots, title FORMULARIO_INSCRIPCION_V1.EXE and status badge", () => {
      assert.match(html, /class="contact-card-header"/);
      assert.match(html, /w-dot red/);
      assert.match(html, /w-dot yellow/);
      assert.match(html, /w-dot green/);
      assert.match(html, /FORMULARIO_INSCRIPCION_V1\.EXE/);
      assert.match(html, /class="contact-badge-status"[^>]*>\s*\[\s*DISPONIBLE\s*\]/);
    });

    it("declares required inputs with semantic IDs and matching labels", () => {
      // Field 01: Name / GitHub
      assert.match(html, /<label\s+class="form-label"\s+for="contact-name">/);
      assert.match(html, /<input\s+type="text"\s+id="contact-name"\s+name="name"[^>]*required/);
      assert.match(html, /id="err-contact-name"/);

      // Field 02: Email
      assert.match(html, /<label\s+class="form-label"\s+for="contact-email">/);
      assert.match(html, /<input\s+type="email"\s+id="contact-email"\s+name="email"[^>]*required/);
      assert.match(html, /id="err-contact-email"/);

      // Field 04: Interest select & preview button
      assert.match(html, /<label\s+class="form-label"\s+for="contact-interest">/);
      assert.match(html, /<select\s+id="contact-interest"\s+name="audioInterest"/);
      assert.match(html, /value="kokoro_local"/);
      assert.match(html, /value="cloned_voices"/);
      assert.match(html, /value="cuadrilla_crew"/);
      assert.match(html, /value="whisper_stt"/);
      assert.match(html, /value="custom_cloning"/);
      assert.match(html, /id="btn-preview-form-voice"/);

      // Field 05: Message textarea
      assert.match(html, /<label\s+class="form-label"\s+for="contact-message">/);
      assert.match(html, /<textarea\s+id="contact-message"\s+name="message"/);
    });

    it("contains role selector radiogroup with all 4 required roles", () => {
      assert.match(html, /role="radiogroup"/);
      assert.match(html, /class="role-selector-grid"/);
      assert.match(html, /value="DEV"/);
      assert.match(html, /value="ARCHITECT"/);
      assert.match(html, /value="LEAD"/);
      assert.match(html, /value="ENTHUSIAST"/);
      assert.match(html, /class="role-box"/);
      assert.match(html, /class="role-code"/);
      assert.match(html, /class="role-desc"/);
    });

    it("contains submit button and aria-live feedback banner", () => {
      assert.match(html, /id="btn-submit-contact"/);
      assert.match(html, /ENVIAR REGISTRO ➔/);
      assert.match(html, /id="form-feedback-banner"/);
      assert.match(html, /role="alert"/);
      assert.match(html, /aria-live="polite"/);
      assert.match(html, /PERSISTENCIA LOCAL \/\/ SIN TRACKERS/);
    });

    it("verifies zero generic emojis in #contacto section", () => {
      const contactSection = html.slice(html.indexOf('id="contacto"'), html.indexOf('class="footer-wrapper"'));
      assert.doesNotMatch(contactSection, /[🎙️🎩🧭⚡🛡️⚙️⏹️🔊🔉🔇💡⌨️🚀📩✉️📝✨🔥👍]/, "No generic emojis in #contacto");
    });

    it("defines all neo-brutalist CSS classes and theme overrides in styles.css", () => {
      assert.match(css, /\.contact-card-wrapper/);
      assert.match(css, /\.contact-card-header/);
      assert.match(css, /\.contact-badge-status/);
      assert.match(css, /\.brutalist-form/);
      assert.match(css, /\.form-grid/);
      assert.match(css, /\.form-group/);
      assert.match(css, /\.form-group-full/);
      assert.match(css, /\.form-label/);
      assert.match(css, /\.label-tag/);
      assert.match(css, /\.required-star/);
      assert.match(css, /\.form-input/);
      assert.match(css, /\.form-select/);
      assert.match(css, /\.form-textarea/);
      assert.match(css, /\.form-input:focus/);
      assert.match(css, /\.form-select:focus/);
      assert.match(css, /\.form-textarea:focus/);
      assert.match(css, /\.input-invalid/);
      assert.match(css, /\.form-error-msg/);
      assert.match(css, /\.role-selector-grid/);
      assert.match(css, /\.role-option/);
      assert.match(css, /\.role-input/);
      assert.match(css, /\.role-box/);
      assert.match(css, /\.role-code/);
      assert.match(css, /\.role-desc/);
      assert.match(css, /\.role-option:hover \.role-box/);
      assert.match(css, /\.role-input:checked \+ \.role-box/);
      assert.match(css, /\.input-with-action/);
      assert.match(css, /\.btn-select-preview/);
      assert.match(css, /\.form-actions-bar/);
      assert.match(css, /\.form-feedback-banner/);
      assert.match(css, /\.form-feedback-banner\.success/);
      assert.match(css, /\.form-feedback-banner\.error/);
      assert.match(css, /\.form-feedback-banner\.hidden/);

      // Dark mode overrides
      assert.match(css, /body\.dark-mode \.contact-card-wrapper/);
      assert.match(css, /body\.dark-mode \.form-input/);
      assert.match(css, /body\.dark-mode \.role-box/);
      assert.match(css, /body\.dark-mode \.role-input:checked \+ \.role-box/);
      assert.match(css, /body\.dark-mode \.btn-select-preview/);
      assert.match(css, /#00ff66/);
    });

    it("verifies JS setupContactForm, storage key, validation, and audio tones in app.js", () => {
      assert.match(js, /const\s+STORAGE_KEY_CONTACTS\s*=\s*"pi_voice_contacts";/);
      assert.match(js, /function\s+setupContactForm\s*\(/);
      assert.match(js, /setupContactForm\(\);/);
      assert.match(js, /form-contact/);
      assert.match(js, /form-feedback-banner/);
      assert.match(js, /btn-submit-contact/);
      assert.match(js, /btn-preview-form-voice/);
      assert.match(js, /input-invalid/);
      assert.match(js, /TRANSMITIENDO\.\.\./);
      assert.match(js, /\[STATUS::OK\]\s*¡Inscripción recibida!/);

      // Voice preview mappings
      assert.match(js, /kokoro_local:\s*"gentleman"/);
      assert.match(js, /cloned_voices:\s*"valeria"/);
      assert.match(js, /cuadrilla_crew:\s*"dora"/);
      assert.match(js, /whisper_stt:\s*"alex"/);
      assert.match(js, /custom_cloning:\s*"juan_carlos"/);

      // Audio feedback tones
      assert.match(js, /playRetroTone\(140,\s*0\.18,\s*"sawtooth"\)/);
      assert.match(js, /playRetroTone\(523,\s*0\.08,\s*"triangle"\)/);
      assert.match(js, /playRetroTone\(659,\s*0\.08,\s*"triangle"\)/);
      assert.match(js, /playRetroTone\(784,\s*0\.12,\s*"triangle"\)/);
    });
  });
});
