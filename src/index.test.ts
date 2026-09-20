import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import voiceExtension, { VoiceControlBarComponent, resolveSubagentVoice, cleanPhaseTitle } from "./index.ts";
import { DEFAULT_CONFIG } from "./config.ts";
import { TldrSummarizer } from "./tldr.ts";

describe("Voice Extension Entrypoint", () => {
  it("registers event listeners and /voice command", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-index-test-"));
    process.env.PI_VOICE_CONFIG_PATH = path.join(tmpDir, "voice.json");

    try {
      const listeners: Record<string, Function[]> = {};
      let registeredCommandName = "";
      let registeredCommandOpts: any = null;

      const mockPi: any = {
        on(event: string, handler: Function) {
          listeners[event] = listeners[event] || [];
          listeners[event].push(handler);
        },
        registerCommand(name: string, opts: any) {
          registeredCommandName = name;
          registeredCommandOpts = opts;
        },
        registerShortcut(key: string, opts: any) {},
      };

      voiceExtension(mockPi);

      // Verify listeners registered
      assert.ok(listeners["session_start"]);
      assert.ok(listeners["agent_end"]);
      assert.ok(listeners["input"]);
      assert.ok(listeners["session_shutdown"]);

      // Verify command registered
      assert.equal(registeredCommandName, "voice");
      assert.ok(typeof registeredCommandOpts.handler === "function");

      // Test command handlers with mock context
      const notifications: { msg: string; type: string }[] = [];
      const statuses: { key: string; val: any }[] = [];

      const mockCtx: any = {
        ui: {
          notify(msg: string, type: string) {
            notifications.push({ msg, type });
          },
          setStatus(key: string, val: any) {
            statuses.push({ key, val });
          },
        },
      };

      // Run /voice on
      await registeredCommandOpts.handler("on", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("ACTIVADA")));

      // Run /voice off
      await registeredCommandOpts.handler("off", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("DESACTIVADA")));

      // Run /voice status
      await registeredCommandOpts.handler("status", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("[Voice]")));

      // Run /voice volume
      await registeredCommandOpts.handler("volume 80", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("80%")));

      // Run /voice tldr
      await registeredCommandOpts.handler("tldr", mockCtx);

      // Run /voice phases
      await registeredCommandOpts.handler("phases off", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("fases del orquestador DESACTIVADA")));

      await registeredCommandOpts.handler("phases on", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("fases del orquestador ACTIVADA")));
      assert.ok(notifications.some((n) => n.msg.includes("TL;DR ACTIVADO")));

      // Test input cancels speech
      assert.doesNotThrow(() => {
        listeners["input"][0]({}, mockCtx);
      });
    } finally {
      delete process.env.PI_VOICE_CONFIG_PATH;
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it("VoiceControlBarComponent renders buttons and routes clicks properly", async () => {
    const mockTheme: any = {
      fg: (_col: string, text: string) => text,
      bg: (_col: string, text: string) => text,
      bold: (text: string) => `*${text}*`,
    };

    let stopped = false;
    let recorded = false;
    let volumeClicked = false;

    const bar = new VoiceControlBarComponent(
      mockTheme,
      () => true, // isPlaying: true
      () => false, // isRecording: false
      () => 0.8, // volume: 80%
      () => {
        stopped = true;
      },
      () => {
        recorded = true;
      },
      () => {
        volumeClicked = true;
      }
    );

    const rendered = bar.render(80);
    assert.equal(rendered.length, 1);
    assert.ok(rendered[0].includes("Detener"));
    assert.ok(rendered[0].includes("Dictar"));
    assert.ok(rendered[0].includes("80%"));

    // Click on stop button area (x = 2)
    bar.handleMouse({
      type: "click",
      button: "left",
      x: 2,
      y: 0,
      width: 80,
      height: 1,
      screenX: 2,
      screenY: 0,
      shift: false,
      alt: false,
      ctrl: false,
    });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(stopped, true);

    // Click on dictate button area (x = 20)
    bar.handleMouse({
      type: "click",
      button: "left",
      x: 20,
      y: 0,
      width: 80,
      height: 1,
      screenX: 20,
      screenY: 0,
      shift: false,
      alt: false,
      ctrl: false,
    });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(recorded, true);

    // Click on volume button area (x = 35)
    bar.handleMouse({
      type: "click",
      button: "left",
      x: 35,
      y: 0,
      width: 80,
      height: 1,
      screenX: 35,
      screenY: 0,
      shift: false,
      alt: false,
      ctrl: false,
    });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(volumeClicked, true);
  });

  it("resolves subagent roles and distinct Spanish voices correctly", () => {
    const scout = resolveSubagentVoice("gentle-ai-explore", DEFAULT_CONFIG);
    assert.equal(scout.role, "Exploradora");
    assert.equal(scout.name, "Dora");
    assert.equal(scout.voice, "ef_dora");

    const worker = resolveSubagentVoice("gentle-ai-worker", DEFAULT_CONFIG);
    assert.equal(worker.role, "Programador");
    assert.equal(worker.name, "Alex");
    assert.equal(worker.voice, "em_alex");

    const reviewer = resolveSubagentVoice("gentle-ai-verify", DEFAULT_CONFIG);
    assert.equal(reviewer.role, "Auditor");
    assert.equal(reviewer.name, "Santa");
    assert.equal(reviewer.voice, "em_santa");
  });

  it("cleans and translates orchestrator phase titles correctly", () => {
    assert.equal(
      cleanPhaseTitle("Task 1: HTML Architecture & Semantic Structure"),
      "HTML Architecture & Semantic Structure"
    );
    assert.equal(
      cleanPhaseTitle("#2 - `src/index.ts` setup"),
      "src/index.ts setup"
    );
    assert.equal(
      cleanPhaseTitle("Task 3: create unit tests and verification"),
      "crear pruebas unitarias y verificación"
    );
    assert.equal(
      cleanPhaseTitle(""),
      ""
    );
  });

  it("handles /voice title, /voice jefe and persists userTitle", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-title-test-"));
    const configPath = path.join(tmpDir, "voice.json");
    process.env.PI_VOICE_CONFIG_PATH = configPath;

    try {
      const listeners: Record<string, Function[]> = {};
      let registeredCommandOpts: any = null;

      const mockPi: any = {
        on(event: string, handler: Function) {
          listeners[event] = listeners[event] || [];
          listeners[event].push(handler);
        },
        registerCommand(_name: string, opts: any) {
          registeredCommandOpts = opts;
        },
        registerShortcut() {},
      };

      voiceExtension(mockPi);

      const notifications: { msg: string; type: string }[] = [];
      const mockCtx: any = {
        ui: {
          notify(msg: string, type: string) {
            notifications.push({ msg, type });
          },
          setStatus() {},
        },
      };

      // 1. Query title when default
      await registeredCommandOpts.handler("title", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("Jefe")));

      // 2. Set title with /voice title Comandante
      notifications.length = 0;
      await registeredCommandOpts.handler("title Comandante", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("Comandante")));

      // Verify persistence in voice.json
      assert.ok(fs.existsSync(configPath));
      let saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      assert.equal(saved.subagents?.userTitle, "Comandante");

      // 3. Set title with /voice jefe Sensei
      notifications.length = 0;
      await registeredCommandOpts.handler("jefe Sensei", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("Sensei")));

      saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      assert.equal(saved.subagents?.userTitle, "Sensei");

      // 4. Set title with /voice apelativo Capitán
      notifications.length = 0;
      await registeredCommandOpts.handler("apelativo Capitán", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("Capitán")));

      saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      assert.equal(saved.subagents?.userTitle, "Capitán");

      // 5. Query title again
      notifications.length = 0;
      await registeredCommandOpts.handler("title", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("Capitán")));

      // 6. Test TldrSummarizer uses custom userTitle in fallback
      const summary = await TldrSummarizer.summarize(
        "Technical verification report: All tests passed and completed. Running suites check duration and build files found.",
        {
          crewMode: true,
          userTitle: "Capitán",
          baseUrl: "http://127.0.0.1:9999",
          timeoutMs: 1,
        }
      );
      assert.ok(summary.startsWith("Capitán,"));
    } finally {
      delete process.env.PI_VOICE_CONFIG_PATH;
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });
});
