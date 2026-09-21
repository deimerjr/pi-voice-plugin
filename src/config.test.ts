import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ConfigManager, DEFAULT_CONFIG } from "./config.ts";

describe("ConfigManager", () => {
  let tmpDir: string;
  let tmpConfigFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-config-test-"));
    tmpConfigFile = path.join(tmpDir, "voice.json");
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("loads default configuration when file does not exist", () => {
    const manager = new ConfigManager(tmpConfigFile);
    const config = manager.getConfig();

    assert.equal(config.autoRead, false);
    assert.equal(config.filterCode, "omit");
    assert.equal(config.provider, "openai");
    assert.equal(config.openai.voice, "nova");
    assert.equal(config.concurrency, "queue");
    assert.equal(config.announceProject, false);
    assert.equal(config.tldrLevel, "medium");
    assert.equal(config.subagents.scoutName, "Dora");
    assert.equal(config.subagents.workerName, "Alex");
    assert.equal(config.subagents.reviewerName, "Santa");
    assert.equal(config.subagents.orchestratorName, "el Gentleman");
    assert.equal(config.subagents.announceTests, true);
  });

  it("persists and reloads config updates including concurrency mode", () => {
    const manager = new ConfigManager(tmpConfigFile);
    manager.save({
      autoRead: true,
      provider: "elevenlabs",
      concurrency: "interrupt",
    });

    const manager2 = new ConfigManager(tmpConfigFile);
    const config2 = manager2.getConfig();
    assert.equal(config2.autoRead, true);
    assert.equal(config2.provider, "elevenlabs");
    assert.equal(config2.openai.voice, "nova"); // preserves nested defaults
    assert.equal(config2.concurrency, "interrupt");

    // Can update to 'off'
    manager2.save({ concurrency: "off" });
    const manager3 = new ConfigManager(tmpConfigFile);
    assert.equal(manager3.getConfig().concurrency, "off");

    // Can update to 'focus'
    manager3.save({ concurrency: "focus" });
    const manager4 = new ConfigManager(tmpConfigFile);
    assert.equal(manager4.getConfig().concurrency, "focus");
  });

  it("persists and reloads announceProject toggle cleanly", () => {
    const manager = new ConfigManager(tmpConfigFile);
    assert.equal(manager.getConfig().announceProject, false);

    manager.save({ announceProject: true });
    assert.equal(manager.getConfig().announceProject, true);

    const reloaded = new ConfigManager(tmpConfigFile);
    assert.equal(reloaded.getConfig().announceProject, true);

    reloaded.save({ announceProject: false });
    assert.equal(reloaded.getConfig().announceProject, false);

    const reloaded2 = new ConfigManager(tmpConfigFile);
    assert.equal(reloaded2.getConfig().announceProject, false);
  });

  it("updates nested provider settings cleanly", () => {
    const manager = new ConfigManager(tmpConfigFile);
    manager.updateNested("openai", {
      voice: "alloy",
      speed: 1.25,
    });

    const config = manager.getConfig();
    assert.equal(config.openai.voice, "alloy");
    assert.equal(config.openai.speed, 1.25);
    assert.equal(config.openai.model, "tts-1");
  });

  it("persists and reloads announceTests toggle in subagents config", () => {
    const manager = new ConfigManager(tmpConfigFile);
    assert.equal(manager.getConfig().subagents.announceTests, true);

    manager.updateNested("subagents", { announceTests: false });
    assert.equal(manager.getConfig().subagents.announceTests, false);

    const reloadedManager = new ConfigManager(tmpConfigFile);
    assert.equal(reloadedManager.getConfig().subagents.announceTests, false);

    reloadedManager.updateNested("subagents", { announceTests: true });
    assert.equal(reloadedManager.getConfig().subagents.announceTests, true);

    const reloadedManager2 = new ConfigManager(tmpConfigFile);
    assert.equal(reloadedManager2.getConfig().subagents.announceTests, true);
  });

  it("resolves API key from config or environment variables", () => {
    const prevKey = process.env.OPENAI_API_KEY;
    try {
      process.env.OPENAI_API_KEY = "sk-test-env-key";
      const manager = new ConfigManager(tmpConfigFile);
      assert.equal(manager.getActiveApiKey(), "sk-test-env-key");

      manager.updateNested("openai", { apiKey: "sk-explicit-key" });
      assert.equal(manager.getActiveApiKey(), "sk-explicit-key");

      // Auto-strip angle brackets and quotes
      manager.updateNested("openai", { apiKey: "<sk-wrapped-in-brackets>" });
      assert.equal(manager.getActiveApiKey(), "sk-wrapped-in-brackets");

      manager.updateNested("openai", { apiKey: "\"sk-wrapped-in-quotes\"" });
      assert.equal(manager.getActiveApiKey(), "sk-wrapped-in-quotes");
    } finally {
      if (prevKey !== undefined) {
        process.env.OPENAI_API_KEY = prevKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });

  it("persists and validates tldrLevel cleanly", () => {
    const manager = new ConfigManager(tmpConfigFile);
    assert.equal(manager.getConfig().tldrLevel, "medium");

    manager.save({ tldrLevel: "high" });
    assert.equal(manager.getConfig().tldrLevel, "high");

    const reloaded = new ConfigManager(tmpConfigFile);
    assert.equal(reloaded.getConfig().tldrLevel, "high");

    manager.save({ tldrLevel: "low" });
    assert.equal(manager.getConfig().tldrLevel, "low");

    // Invalid value falls back to existing or medium
    manager.save({ tldrLevel: "invalid" as any });
    assert.equal(manager.getConfig().tldrLevel, "low");
  });

  it("persists and reloads custom subagent names cleanly", () => {
    const manager = new ConfigManager(tmpConfigFile);
    assert.equal(manager.getConfig().subagents.scoutName, "Dora");
    assert.equal(manager.getConfig().subagents.workerName, "Alex");
    assert.equal(manager.getConfig().subagents.reviewerName, "Santa");
    assert.equal(manager.getConfig().subagents.orchestratorName, "el Gentleman");

    manager.updateNested("subagents", {
      scoutName: "Hermes",
      workerName: "Ciro",
      reviewerName: "Minos",
      orchestratorName: "Arquitecto",
    });

    const cfg = manager.getConfig();
    assert.equal(cfg.subagents.scoutName, "Hermes");
    assert.equal(cfg.subagents.workerName, "Ciro");
    assert.equal(cfg.subagents.reviewerName, "Minos");
    assert.equal(cfg.subagents.orchestratorName, "Arquitecto");

    const reloaded = new ConfigManager(tmpConfigFile);
    assert.equal(reloaded.getConfig().subagents.scoutName, "Hermes");
    assert.equal(reloaded.getConfig().subagents.workerName, "Ciro");
    assert.equal(reloaded.getConfig().subagents.reviewerName, "Minos");
    assert.equal(reloaded.getConfig().subagents.orchestratorName, "Arquitecto");
  });
});
