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
    assert.ok(lines.some((l) => l.includes("Modo Resumen (TL;DR)")));

    const items = (menu as any).getItemsForScreen(configManager.getConfig());
    const tldrItem = items.find((i: any) => i.value === "toggle_tldr");
    assert.ok(tldrItem);
    assert.ok(tldrItem.label.includes("Lectura completa"));
    assert.equal(tldrItem.description, "Lee las respuestas completas palabra por palabra sin resumir");

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

  it("navigates to concurrency submenu, renders options with radio markers, updates mode and navigates back with Escape", async () => {
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

    // Verify main menu renders concurrency option
    const mainLines = menu.render(80);
    assert.ok(mainLines.some((l: string) => l.includes("Concurrencia entre sesiones")));

    // 1. Navigate to concurrency screen
    await (menu as any).handleItemSelection("goto_concurrency");
    assert.equal((menu as any).currentScreen, "concurrency");

    const concurrencyLines = menu.render(80);
    assert.ok(concurrencyLines.some((l: string) => l.includes("Concurrencia de Audio entre Sesiones")));
    assert.ok(concurrencyLines.some((l: string) => l.includes("Opción 1: Cola ordenada FIFO")));
    assert.ok(concurrencyLines.some((l: string) => l.includes("Opción 2: Interrumpir sesión previa")));
    assert.ok(concurrencyLines.some((l: string) => l.includes("Opción 3: Modo Foco")));
    assert.ok(concurrencyLines.some((l: string) => l.includes("Desactivado (Sin bloqueo)")));
    assert.ok(concurrencyLines.some((l: string) => l.includes("Anunciar nombre de proyecto/sesión")));

    // 2. Select interrupt mode
    await (menu as any).handleItemSelection("set_concurrency:interrupt");
    assert.equal(configManager.getConfig().concurrency, "interrupt");
    assert.equal(player.getConcurrency(), "interrupt");
    assert.equal(latestConfig?.concurrency, "interrupt");

    // 3. Select focus mode
    await (menu as any).handleItemSelection("set_concurrency:focus");
    assert.equal(configManager.getConfig().concurrency, "focus");
    assert.equal(player.getConcurrency(), "focus");
    assert.equal(latestConfig?.concurrency, "focus");

    // 4. Toggle announce project
    assert.equal(configManager.getConfig().announceProject, false);
    await (menu as any).handleItemSelection("toggle_announce_project");
    assert.equal(configManager.getConfig().announceProject, true);
    assert.equal(latestConfig?.announceProject, true);
    assert.ok((menu as any).statusNotice.includes("ACTIVADO"));

    // Toggle back to false
    await (menu as any).handleItemSelection("toggle_announce_project");
    assert.equal(configManager.getConfig().announceProject, false);
    assert.equal(latestConfig?.announceProject, false);

    // 5. Escape on concurrency screen returns to main menu
    menu.handleInput("\x1b");
    assert.equal(closed, false);
    assert.equal((menu as any).currentScreen, "main");

    // 6. Second Escape closes menu
    menu.handleInput("\x1b");
    assert.equal(closed, true);
  });

  it("toggles announceTests in subagents screen via sub_toggle_tests", async () => {
    let latestConfig: any = null;
    const menu = new VoiceMenuComponent({
      configManager,
      player,
      theme: mockTheme,
      tui: mockTui,
      ctx: mockCtx,
      initialScreen: "main",
      onClose: () => {},
      onConfigChanged: (cfg) => {
        latestConfig = cfg;
      },
    });

    // Navigate to subagents screen
    await (menu as any).handleItemSelection("goto_subagents");
    assert.equal((menu as any).currentScreen, "subagents");

    const items = (menu as any).getItemsForScreen(configManager.getConfig());
    const testToggleItem = items.find((it: any) => it.value === "sub_toggle_tests");
    assert.ok(testToggleItem, "sub_toggle_tests should exist in subagents screen");
    assert.ok(testToggleItem.label.includes("Anunciar pruebas de verificación: SÍ"));
    assert.ok(testToggleItem.label.includes("●"));
    assert.equal(testToggleItem.description, "Locución oral al ejecutar tests en consola sin subagentes");

    // Toggle OFF
    await (menu as any).handleItemSelection("sub_toggle_tests");
    assert.equal(configManager.getConfig().subagents.announceTests, false);
    assert.equal(latestConfig?.subagents?.announceTests, false);
    assert.equal((menu as any).statusNotice, "Anuncio de pruebas de verificación DESACTIVADO");

    const itemsAfterOff = (menu as any).getItemsForScreen(configManager.getConfig());
    const itemOff = itemsAfterOff.find((it: any) => it.value === "sub_toggle_tests");
    assert.ok(itemOff.label.includes("Anunciar pruebas de verificación: NO"));
    assert.ok(itemOff.label.includes("○"));

    // Toggle ON again
    await (menu as any).handleItemSelection("sub_toggle_tests");
    assert.equal(configManager.getConfig().subagents.announceTests, true);
    assert.equal(latestConfig?.subagents?.announceTests, true);
    assert.equal((menu as any).statusNotice, "Anuncio de pruebas de verificación ACTIVADO");
  });

  it("navigates to tldr_level submenu, renders radio options, updates level and navigates back with Escape", async () => {
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

    // 1. Check main menu renders Nivel de Resumen option
    const mainLines = menu.render(80);
    assert.ok(mainLines.some((l: string) => l.includes("Nivel de Resumen")));

    // 2. Navigate to tldr_level screen
    await (menu as any).handleItemSelection("goto_tldr_level");
    assert.equal((menu as any).currentScreen, "tldr_level");

    const tldrLines = menu.render(80);
    assert.ok(tldrLines.some((l: string) => l.includes("Nivel de Resumen TL;DR")));
    assert.ok(tldrLines.some((l: string) => l.includes("Alto: 1 frase")));
    assert.ok(tldrLines.some((l: string) => l.includes("Medio: 2-3 frases")));
    assert.ok(tldrLines.some((l: string) => l.includes("Bajo: 80-90% detalle")));

    // 3. Select 'high'
    await (menu as any).handleItemSelection("set_tldr_level:high");
    assert.equal(configManager.getConfig().tldrLevel, "high");
    assert.equal(latestConfig?.tldrLevel, "high");
    assert.equal((menu as any).currentScreen, "main");

    // 4. Return to tldr_level and select 'low'
    await (menu as any).handleItemSelection("goto_tldr_level");
    await (menu as any).handleItemSelection("set_tldr_level:low");
    assert.equal(configManager.getConfig().tldrLevel, "low");
    assert.equal(latestConfig?.tldrLevel, "low");

    // 5. Test Escape on tldr_level navigates back to main
    await (menu as any).handleItemSelection("goto_tldr_level");
    assert.equal((menu as any).currentScreen, "tldr_level");
    menu.handleInput("\x1b");
    assert.equal((menu as any).currentScreen, "main");
    assert.equal(closed, false);

    // Escape on main closes
    menu.handleInput("\x1b");
    assert.equal(closed, true);
  });

  it("navigates to subagent_name submenu, renders role presets, updates names and handles Escape and reset", async () => {
    let latestConfig: any = null;
    const inputCtx: any = {
      ...mockCtx,
      ui: {
        ...mockCtx.ui,
        input: async (_prompt: string, _def: string) => "Ciro",
      },
    };

    const menu = new VoiceMenuComponent({
      configManager,
      player,
      theme: mockTheme,
      tui: mockTui,
      ctx: inputCtx,
      initialScreen: "subagents",
      onClose: () => {},
      onConfigChanged: (cfg) => {
        latestConfig = cfg;
      },
    });

    // 1. Verify subagents screen displays agent name items
    const subLines = menu.render(80);
    assert.ok(subLines.some((l: string) => l.includes("Nombre de Explorador")));
    assert.ok(subLines.some((l: string) => l.includes("Nombre de Programador")));
    assert.ok(subLines.some((l: string) => l.includes("Nombre de Auditor")));
    assert.ok(subLines.some((l: string) => l.includes("Nombre de Orquestador")));

    // 2. Select sub_name:scout to open subagent_name screen
    await (menu as any).handleItemSelection("sub_name:scout");
    assert.equal((menu as any).currentScreen, "subagent_name");
    assert.equal((menu as any).selectedSubagentRole, "scout");

    const scoutLines = menu.render(80);
    assert.ok(scoutLines.some((l: string) => l.includes("Nombre para Explorador / Scout")));
    assert.ok(scoutLines.some((l: string) => l.includes("Dora")));
    assert.ok(scoutLines.some((l: string) => l.includes("Hermes")));

    // 3. Select Hermes preset for scout
    await (menu as any).handleItemSelection("set_sub_name:scout:Hermes");
    assert.equal(configManager.getConfig().subagents.scoutName, "Hermes");
    assert.equal(latestConfig?.subagents?.scoutName, "Hermes");
    assert.equal((menu as any).currentScreen, "subagents");

    // 4. Test Escape in subagent_name returns to subagents
    await (menu as any).handleItemSelection("sub_name:worker");
    assert.equal((menu as any).currentScreen, "subagent_name");
    menu.handleInput("\x1b");
    assert.equal((menu as any).currentScreen, "subagents");

    // 5. Test custom_sub_name for worker using input dialog
    await (menu as any).handleItemSelection("custom_sub_name:worker");
    assert.equal(configManager.getConfig().subagents.workerName, "Ciro");
    assert.equal(latestConfig?.subagents?.workerName, "Ciro");

    // 6. Test sub_reset restores default names
    await (menu as any).handleItemSelection("sub_reset");
    const resetCfg = configManager.getConfig();
    assert.equal(resetCfg.subagents.scoutName, "Dora");
    assert.equal(resetCfg.subagents.workerName, "Alex");
    assert.equal(resetCfg.subagents.reviewerName, "Santa");
    assert.equal(resetCfg.subagents.orchestratorName, "el Gentleman");
    assert.equal(latestConfig?.subagents?.scoutName, "Dora");
    assert.equal(latestConfig?.subagents?.workerName, "Alex");
  });
});
