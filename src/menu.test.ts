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
});
