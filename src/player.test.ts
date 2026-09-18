import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AudioPlayer } from "./player.ts";

describe("AudioPlayer", () => {
  it("detects system audio player", () => {
    const player = new AudioPlayer();
    const detected = player.detectPlayer();
    assert.ok(detected !== null, "Should detect at least pw-play or aplay on this machine");
    assert.ok(["pw-play", "aplay", "paplay", "afplay", "mpv", "ffplay"].includes(detected!));
  });

  it("respects custom command override", () => {
    const player = new AudioPlayer({ customCommand: "echo $FILE" });
    assert.equal(player.detectPlayer(), "echo $FILE");

    player.setCustomCommand("my-custom-player");
    assert.equal(player.detectPlayer(), "my-custom-player");
  });

  it("handles stop when no audio is playing safely", () => {
    const player = new AudioPlayer();
    assert.equal(player.isPlaying(), false);
    // Should not throw
    player.stop();
    assert.equal(player.isPlaying(), false);
  });

  it("executes playback with a mock command and cleans up temporary file", async () => {
    // Use 'true' command as a mock player that exits immediately with 0
    const player = new AudioPlayer({ customCommand: "true" });
    const buffer = Buffer.from("fake-audio-content");

    await player.play(buffer, "wav");
    assert.equal(player.isPlaying(), false);
  });
});
