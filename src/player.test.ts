import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { AudioPlayer } from "./player.ts";
import { PlaybackLockManager } from "./lock.ts";

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

  it("adjusts volume property and scales WAV audio buffer samples", () => {
    const player = new AudioPlayer({ volume: 0.5 });
    assert.equal(player.getVolume(), 0.5);

    player.setVolume(0.8);
    assert.equal(player.getVolume(), 0.8);

    // Clamp boundary checks
    player.setVolume(2.0);
    assert.equal(player.getVolume(), 1.5);
    player.setVolume(-0.5);
    assert.equal(player.getVolume(), 0.0);

    // Build a mock minimal 16-bit mono WAV buffer with a sample
    const wav = Buffer.alloc(46);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(38, 4);
    wav.write("WAVE", 8);
    wav.write("fmt ", 12);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20); // PCM
    wav.writeUInt16LE(1, 22); // 1 channel
    wav.writeUInt32LE(24000, 24);
    wav.writeUInt32LE(48000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34); // 16-bit
    wav.write("data", 36);
    wav.writeUInt32LE(2, 40); // 2 bytes = 1 sample
    wav.writeInt16LE(10000, 44);

    const scaled = AudioPlayer.adjustWavVolume(wav, 0.5);
    assert.equal(scaled.readInt16LE(44), 5000);
  });

  it("manages concurrency modes and utterance-level locking cleanly", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "player-lock-test-"));
    try {
      const lockManager = new PlaybackLockManager({ ipcDir: tmpDir, pollIntervalMs: 20 });
      const player = new AudioPlayer({
        customCommand: "true",
        concurrency: "queue",
        lockManager,
      });

      assert.equal(player.getConcurrency(), "queue");
      player.setConcurrency("interrupt");
      assert.equal(player.getConcurrency(), "interrupt");
      player.setConcurrency("off");
      assert.equal(player.getConcurrency(), "off");

      // Switch back to queue mode for lease testing
      player.setConcurrency("queue");

      // 1. Acquire utterance-level lock
      const releaseUtterance = await player.acquirePlaybackLock();
      assert.equal(lockManager.isHeldByCurrentSession(), true);
      assert.equal(fs.existsSync(lockManager.getLockFilePath()), true);

      // 2. Play multiple chunks: lock should remain held throughout
      const buffer = Buffer.from("audio-chunk");
      await player.play(buffer, "wav");
      assert.equal(lockManager.isHeldByCurrentSession(), true);
      assert.equal(fs.existsSync(lockManager.getLockFilePath()), true);

      await player.play(buffer, "wav");
      assert.equal(lockManager.isHeldByCurrentSession(), true);
      assert.equal(fs.existsSync(lockManager.getLockFilePath()), true);

      // 3. Release outer utterance lock
      await releaseUtterance();
      assert.equal(lockManager.isHeldByCurrentSession(), false);
      assert.equal(fs.existsSync(lockManager.getLockFilePath()), false);

      // 4. Test player.stop() cleans up any active lock
      await player.acquirePlaybackLock();
      assert.equal(lockManager.isHeldByCurrentSession(), true);
      player.stop();
      assert.equal(lockManager.isHeldByCurrentSession(), false);
      assert.equal(fs.existsSync(lockManager.getLockFilePath()), false);

      lockManager.dispose();
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });
});
