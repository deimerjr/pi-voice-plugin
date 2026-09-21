import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import voiceExtension, {
  VoiceControlBarComponent,
  resolveSubagentVoice,
  cleanPhaseTitle,
  isTestCommand,
  getProjectName,
  TEST_ANNOUNCE_COOLDOWN_MS,
} from "./index.ts";
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

      // Run /voice tests off
      notifications.length = 0;
      await registeredCommandOpts.handler("tests off", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("pruebas de verificación DESACTIVADO")));

      // Run /voice tests on
      notifications.length = 0;
      await registeredCommandOpts.handler("tests on", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("pruebas de verificación ACTIVADO")));

      // Run /voice pruebas off
      notifications.length = 0;
      await registeredCommandOpts.handler("pruebas off", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("pruebas de verificación DESACTIVADO")));

      // Run /voice pruebas on
      notifications.length = 0;
      await registeredCommandOpts.handler("pruebas on", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("pruebas de verificación ACTIVADO")));

      // Run /voice test off
      notifications.length = 0;
      await registeredCommandOpts.handler("test off", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("pruebas de verificación DESACTIVADO")));

      // Run /voice test on
      notifications.length = 0;
      await registeredCommandOpts.handler("test on", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("pruebas de verificación ACTIVADO")));

      // Run /voice test <frase> (backward compatibility)
      notifications.length = 0;
      await registeredCommandOpts.handler("test probando sonido", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("Reproduciendo prueba con")));

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

  it("evaluates isTestCommand accurately for diverse runners", () => {
    assert.equal(isTestCommand("npm test"), true);
    assert.equal(isTestCommand("npm run test"), true);
    assert.equal(isTestCommand("npm test -- --watch"), true);
    assert.equal(isTestCommand("node --test"), true);
    assert.equal(isTestCommand("node --test landing/landing.test.js"), true);
    assert.equal(isTestCommand("pytest tests/test_core.py"), true);
    assert.equal(isTestCommand("cargo test --release"), true);
    assert.equal(isTestCommand("go test ./..."), true);
    assert.equal(isTestCommand("pnpm test"), true);
    assert.equal(isTestCommand("yarn test"), true);
    assert.equal(isTestCommand("bun test"), true);
    assert.equal(isTestCommand("vitest run"), true);
    assert.equal(isTestCommand("jest"), true);

    // Negative cases
    assert.equal(isTestCommand("npm run build"), false);
    assert.equal(isTestCommand("git status"), false);
    assert.equal(isTestCommand("ls -la"), false);
    assert.equal(isTestCommand("echo test"), false);
    assert.equal(isTestCommand("node index.js"), false);
    assert.equal(isTestCommand(""), false);
    assert.equal(isTestCommand("   "), false);
    assert.equal(isTestCommand(null as any), false);
    assert.equal(isTestCommand(undefined as any), false);
  });

  it("handles direct test announcements with 30s debounce and suppresses during subagent execution", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-test-announce-"));
    const configPath = path.join(tmpDir, "voice.json");
    fs.writeFileSync(configPath, JSON.stringify({ concurrency: "off" }), "utf-8");
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

      const onToolStart = listeners["tool_execution_start"][0];
      const onToolEnd = listeners["tool_execution_end"][0];

      const notifications: { msg: string; type: string }[] = [];
      const mockCtx: any = {
        ui: {
          notify(msg: string, type: string) {
            notifications.push({ msg, type });
          },
          setStatus() {},
        },
      };

      // 1. Direct test start (no subagent running): triggers announcement speech attempt
      notifications.length = 0;
      await onToolStart(
        { toolName: "bash", toolCallId: "call_test_1", args: { command: "npm test" } },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(notifications.length, 1);
      assert.ok(notifications[0].msg.includes("[Voice] Error de reproducción"));

      // 2. Debounce check: second test started immediately (< 30s cooldown)
      notifications.length = 0;
      await onToolStart(
        { toolName: "bash", toolCallId: "call_test_2", args: { command: "npm test" } },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 20));
      // Suppressed by debounce at start!
      assert.equal(notifications.length, 0);

      // 3. Direct test end for call_test_1: triggers outcome announcement
      notifications.length = 0;
      await onToolEnd(
        { toolName: "bash", toolCallId: "call_test_1", args: { command: "npm test" }, isError: false },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(notifications.length, 1);
      assert.ok(notifications[0].msg.includes("[Voice] Error de reproducción"));

      // And for call_test_2: tracked and speaks outcome on completion
      notifications.length = 0;
      await onToolEnd(
        { toolName: "bash", toolCallId: "call_test_2", args: { command: "npm test" }, isError: false },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(notifications.length, 1);
      assert.ok(notifications[0].msg.includes("[Voice] Error de reproducción"));

      // 4. Subagent suppression: when a subagent is running, bash tests are suppressed
      // Launch subagent
      notifications.length = 0;
      await onToolStart(
        {
          toolName: "subagent_run",
          toolCallId: "agent_verify_1",
          args: { agent: "gentle-ai-verify", task: "auditar cambios" },
        },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(notifications.length, 1);

      // Subagent runs a test in bash
      notifications.length = 0;
      await onToolStart(
        { toolName: "bash", toolCallId: "subagent_bash_1", args: { command: "npm test" } },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 20));
      // Must be completely suppressed at start while subagent is running!
      assert.equal(notifications.length, 0);

      // Subagent bash test finishes
      notifications.length = 0;
      await onToolEnd(
        {
          toolName: "bash",
          toolCallId: "subagent_bash_1",
          args: { command: "npm test" },
          isError: false,
        },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 20));
      // Must be completely suppressed at end (not in activeDirectTestCalls)!
      assert.equal(notifications.length, 0);

      // Subagent finishes
      notifications.length = 0;
      await onToolEnd(
        {
          toolName: "subagent_run",
          toolCallId: "agent_verify_1",
          isError: false,
          result: "Verificación completada sin errores",
        },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(notifications.length, 1);

      // 5. Test announcement disabled via /voice tests off
      await registeredCommandOpts.handler("tests off", mockCtx);

      notifications.length = 0;
      await onToolStart(
        { toolName: "bash", toolCallId: "call_test_3", args: { command: "npm test" } },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 20));
      // Suppressed by config toggle
      assert.equal(notifications.length, 0);

      await onToolEnd(
        { toolName: "bash", toolCallId: "call_test_3", args: { command: "npm test" }, isError: false },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 20));
      // Suppressed by config toggle
      assert.equal(notifications.length, 0);
    } finally {
      delete process.env.PI_VOICE_CONFIG_PATH;
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it("getProjectName returns current working directory base name", () => {
    const name = getProjectName();
    assert.ok(name.length > 0);
    assert.equal(name, path.basename(process.cwd()));
  });

  it("handles /voice concurrency focus and /voice project toggles", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-project-test-"));
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

      // 1. /voice concurrency focus
      await registeredCommandOpts.handler("concurrency focus", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("Modo Foco")));

      let saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      assert.equal(saved.concurrency, "focus");

      // 2. /voice project on
      notifications.length = 0;
      await registeredCommandOpts.handler("project on", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("Anuncio de proyecto/sesión ACTIVADO")));

      saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      assert.equal(saved.announceProject, true);

      // 3. /voice proyecto off
      notifications.length = 0;
      await registeredCommandOpts.handler("proyecto off", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("Anuncio de proyecto/sesión DESACTIVADO")));

      saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      assert.equal(saved.announceProject, false);

      // 4. /voice contexto (toggle)
      notifications.length = 0;
      await registeredCommandOpts.handler("contexto", mockCtx);
      assert.ok(notifications.some((n) => n.msg.includes("Anuncio de proyecto/sesión ACTIVADO")));

      saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      assert.equal(saved.announceProject, true);
    } finally {
      delete process.env.PI_VOICE_CONFIG_PATH;
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it("records active session on input, commands, and shortcuts", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-active-session-test-"));
    const configPath = path.join(tmpDir, "voice.json");
    process.env.PI_VOICE_CONFIG_PATH = configPath;

    try {
      const listeners: Record<string, Function[]> = {};
      let registeredCommandOpts: any = null;
      const shortcuts: Record<string, any> = {};

      const mockPi: any = {
        on(event: string, handler: Function) {
          listeners[event] = listeners[event] || [];
          listeners[event].push(handler);
        },
        registerCommand(_name: string, opts: any) {
          registeredCommandOpts = opts;
        },
        registerShortcut(key: string, opts: any) {
          shortcuts[key] = opts;
        },
      };

      voiceExtension(mockPi);

      const mockCtx: any = {
        ui: {
          notify() {},
          setStatus() {},
        },
      };

      // Session start records active session
      await listeners["session_start"][0]({}, mockCtx);

      // Input event records active session
      assert.doesNotThrow(() => {
        listeners["input"][0]({}, mockCtx);
      });

      // Command execution records active session
      await registeredCommandOpts.handler("status", mockCtx);

      // Shortcuts record active session
      if (shortcuts["alt+s"]) {
        await shortcuts["alt+s"].handler(mockCtx);
      }
      if (shortcuts["alt+up"]) {
        await shortcuts["alt+up"].handler(mockCtx);
      }
    } finally {
      delete process.env.PI_VOICE_CONFIG_PATH;
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it("suppresses speech in focus mode when foreign session has focus", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-focus-suppress-"));
    const configPath = path.join(tmpDir, "voice.json");
    // Configure focus mode and autoRead: true
    fs.writeFileSync(
      configPath,
      JSON.stringify({ concurrency: "focus", autoRead: true, announceProject: true }),
      "utf-8"
    );
    process.env.PI_VOICE_CONFIG_PATH = configPath;

    const { spawn } = await import("node:child_process");
    const dummy = spawn("sleep", ["30"], { stdio: "ignore" });
    const aliveForeignPid = dummy.pid!;

    try {
      const listeners: Record<string, Function[]> = {};
      const mockPi: any = {
        on(event: string, handler: Function) {
          listeners[event] = listeners[event] || [];
          listeners[event].push(handler);
        },
        registerCommand() {},
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

      // Import getIpcDirectory to simulate active session from foreign process
      const { getIpcDirectory } = await import("./lock.ts");
      const activeSessionFile = path.join(getIpcDirectory(), "active_session.json");
      fs.writeFileSync(
        activeSessionFile,
        JSON.stringify({ pid: aliveForeignPid, timestamp: Date.now() })
      );

      // Now trigger agent_end (which calls speakText)
      notifications.length = 0;
      await listeners["agent_end"][0](
        { messages: [{ role: "assistant", content: "Mensaje generado por agente de fondo." }] },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 40));

      // Because session is NOT focused, speakText exits cleanly (no audio synthesis attempt)
      assert.equal(notifications.length, 0);

      // Now reclaim focus (e.g. user typed input in this session)
      fs.writeFileSync(
        activeSessionFile,
        JSON.stringify({ pid: process.pid, timestamp: Date.now() })
      );

      // Now trigger agent_end again
      notifications.length = 0;
      await listeners["agent_end"][0](
        { messages: [{ role: "assistant", content: "Mensaje en sesión enfocada." }] },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 40));

      // Now it attempts synthesis (and since no API key is provided, notifies error or synthesizes)
      assert.ok(notifications.length > 0);
      assert.ok(
        notifications.some(
          (n) => n.msg.includes("[Voice] Error de") || n.msg.includes("configuración")
        )
      );
    } finally {
      dummy.kill("SIGKILL");
      delete process.env.PI_VOICE_CONFIG_PATH;
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it("formats project prefix when announceProject is enabled for agent/orchestrator events and avoids duplicates", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-proj-prefix-"));
    const configPath = path.join(tmpDir, "voice.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        concurrency: "off",
        autoRead: true,
        announceProject: true,
        subagents: { enabled: true, announceStart: true },
      }),
      "utf-8"
    );
    process.env.PI_VOICE_CONFIG_PATH = configPath;

    try {
      const listeners: Record<string, Function[]> = {};
      const mockPi: any = {
        on(event: string, handler: Function) {
          listeners[event] = listeners[event] || [];
          listeners[event].push(handler);
        },
        registerCommand() {},
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

      // Trigger subagent start (which runs speakText with isAgentOrOrch = true)
      await listeners["tool_execution_start"][0](
        {
          toolName: "subagent_run",
          toolCallId: "agent_prefix_1",
          args: { agent: "gentle-ai-explore", task: "explorar repo" },
        },
        mockCtx
      );
      await new Promise((r) => setTimeout(r, 40));

      // With announceProject enabled, prefix "En <project>:" is prepended to speech
      const proj = getProjectName();
      assert.ok(proj.length > 0);
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
