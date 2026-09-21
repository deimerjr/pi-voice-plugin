import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VoiceMenuComponent } from "./menu.ts";
import { ConfigManager } from "./config.ts";
import { AudioPlayer } from "./player.ts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("VoiceMenuComponent", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-menu-test-"));
  const tmpConfigFile = path.join(tmpDir, "voice.json");
  const configManager = new ConfigManager(tmpConfigFile);
  const player = new AudioPlayer({ customCommand: "true" });

  const mockTheme: any = {
    fg: (_color: string, text: string) => text,
    bold: (text: string) => `*${text}*`,
  };

  const mockTui: any = {
    requestRender: () => {},
  };

  const mockCtx: any = {
    hasUI: true,
    mode: "tui",
    ui: {
      notify: () => {},
    },
  };

  it("renders main menu screen and items", () => {
    let closed = false;
    const menu = new VoiceMenuComponent({
      configManager,
      player,
      theme: mockTheme,
      tui: mockTui,
      ctx: mockCtx,
      onClose: () => {
        closed = true;
      },
      onConfigChanged: () => {},
    });

    const lines = menu.render(80);
    assert.ok(lines.length > 5);
    assert.ok(lines.some((l) => l.includes("Menú de Voz")));
    assert.ok(lines.some((l) => l.includes("Auto-lectura")));

    // Test Escape key closes menu from main screen
    menu.handleInput("escape");
    assert.equal(closed, true);

    // Test Kitty protocol Escape sequence closes menu
    let closedKitty = false;
    const menu2 = new VoiceMenuComponent({
      configManager,
      player,
      theme: mockTheme,
      tui: mockTui,
      ctx: mockCtx,
      onClose: () => {
        closedKitty = true;
      },
      onConfigChanged: () => {},
    });
    menu2.handleInput("\x1b[27;1;27~");
    assert.equal(closedKitty, true);
  });

  it("Escape in submenu navigates back to main menu then closes", () => {
    let closed = false;
    const menu = new VoiceMenuComponent({
      configManager,
      player,
      theme: mockTheme,
      tui: mockTui,
      ctx: mockCtx,
      initialScreen: "main",
      onClose: () => {
        closed = true;
      },
      onConfigChanged: () => {},
    });

    // Simulate selecting 'goto_voices' to go into voices submenu
    (menu as any).handleItemSelection("goto_voices");
    const submenuLines = menu.render(80);
    assert.ok(submenuLines.some((l) => l.includes("Voces y Muestras")));

    // First Escape should return to main menu, NOT close
    menu.handleInput("\x1b");
    assert.equal(closed, false);
    const mainLines = menu.render(80);
    assert.ok(mainLines.some((l) => l.includes("Menú de Voz")));

    // Second Escape should close the menu
    menu.handleInput("\x1b");
    assert.equal(closed, true);
  });

  it("handles mouse event dispatch without errors", () => {
    const menu = new VoiceMenuComponent({
      configManager,
      player,
      theme: mockTheme,
      tui: mockTui,
      ctx: mockCtx,
      onClose: () => {},
      onConfigChanged: () => {},
    });

    // Render first to initialize mouse layout
    menu.render(80);

    const mouseEvent: any = {
      type: "click",
      button: "left",
      x: 10,
      y: 3,
      width: 80,
      height: 15,
    };

    assert.doesNotThrow(() => {
      menu.handleMouse(mouseEvent);
    });
  });

  it("navigates to subagent_voice submenu, updates voice, and navigates back with Escape", async () => {
    let closed = false;
    let latestConfig: any = null;
    const menu = new VoiceMenuComponent({
      configManager,
      player,
      theme: mockTheme,
      tui: mockTui,
      ctx: mockCtx,
      initialScreen: "main",
      onClose: () => {
        closed = true;
      },
      onConfigChanged: (cfg) => {
        latestConfig = cfg;
      },
    });

    // 1. Navigate to subagents menu
    await (menu as any).handleItemSelection("goto_subagents");
    assert.equal((menu as any).currentScreen, "subagents");

    // 2. Selecting 'sub_voice:scout' switches screen to 'subagent_voice'
    await (menu as any).handleItemSelection("sub_voice:scout");
    assert.equal((menu as any).currentScreen, "subagent_voice");
    assert.equal((menu as any).selectedSubagentRole, "scout");

    const lines = menu.render(80);
    assert.ok(lines.some((l: string) => l.includes("Seleccionar Voz: Explorador / Scout")));
    assert.ok(lines.some((l: string) => l.includes("Volver a Voces de Agentes")));

    // 3. Selecting a voice in 'subagent_voice' updates config.subagents.scout and returns to 'subagents'
    await (menu as any).handleItemSelection("set_sub_voice:scout:mateo");
    assert.equal((menu as any).currentScreen, "subagents");
    assert.equal(configManager.getConfig().subagents.scout, "mateo");
    assert.equal(latestConfig?.subagents?.scout, "mateo");

    const subagentsLines = menu.render(80);
    assert.ok(subagentsLines.some((l: string) => l.includes("Explorador / Scout: [ mateo ]")));

    // 4. Hitting Escape in 'subagent_voice' returns to 'subagents' without closing the menu
    await (menu as any).handleItemSelection("sub_voice:worker");
    assert.equal((menu as any).currentScreen, "subagent_voice");
    assert.equal((menu as any).selectedSubagentRole, "worker");

    menu.handleInput("\x1b");
    assert.equal(closed, false);
    assert.equal((menu as any).currentScreen, "subagents");

    // Subsequent Escape returns to main
    menu.handleInput("\x1b");
    assert.equal(closed, false);
    assert.equal((menu as any).currentScreen, "main");

    // Next Escape closes menu
    menu.handleInput("\x1b");
    assert.equal(closed, true);
  });

  it("provides complete voice lists and renders radio selection correctly in subagent_voice", async () => {
    configManager.save({ provider: "kokoro" });
    const menu = new VoiceMenuComponent({
      configManager,
      player,
      theme: mockTheme,
      tui: mockTui,
      ctx: mockCtx,
      initialScreen: "subagents",
      onClose: () => {},
      onConfigChanged: () => {},
    });

    await (menu as any).handleItemSelection("sub_voice:worker");
    assert.equal((menu as any).currentScreen, "subagent_voice");

    const items = (menu as any).getItemsForScreen(configManager.getConfig());
    assert.ok(items.some((it: any) => it.value === "set_sub_voice:worker:em_alex"));
    assert.ok(items.some((it: any) => it.value === "set_sub_voice:worker:ef_dora"));
    assert.ok(items.some((it: any) => it.value === "set_sub_voice:worker:dora_heart"));
    assert.ok(items.some((it: any) => it.value === "custom_sub_voice:worker"));
    assert.ok(items.some((it: any) => it.value === "back_to_subagents"));

    // Verify navigating back via back_to_subagents
    await (menu as any).handleItemSelection("back_to_subagents");
    assert.equal((menu as any).currentScreen, "subagents");
  });
});
