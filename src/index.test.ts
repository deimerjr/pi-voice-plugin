import { describe, it } from "node:test";
import assert from "node:assert/strict";
import voiceExtension from "./index.ts";

describe("Voice Extension Entrypoint", () => {
  it("registers event listeners and /voice command", async () => {
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

    // Test input cancels speech
    assert.doesNotThrow(() => {
      listeners["input"][0]({}, mockCtx);
    });
  });
});
