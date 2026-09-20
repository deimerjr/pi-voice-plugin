import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { AudioRecorder } from "./recorder.ts";

describe("AudioRecorder", () => {
  it("detects system recorder binary (pw-record or arecord)", () => {
    const recorder = new AudioRecorder();
    const detected = recorder.detectRecorder();
    assert.ok(detected !== null, "Should detect pw-record or arecord on Linux");
    assert.ok(["pw-record", "arecord", "rec", "sox"].includes(detected!));
  });

  it("handles isRecording and cancelRecording cleanly when idle", () => {
    const recorder = new AudioRecorder();
    assert.equal(recorder.isRecording(), false);
    assert.doesNotThrow(() => recorder.cancelRecording());
    assert.equal(recorder.isRecording(), false);
  });

  it("records and stops cleanly with a mock command", async () => {
    // Mock command that writes a dummy wav file and sleeps
    const mockCmd = "sh -c 'echo RIFFdata > $FILE; sleep 2'";
    const recorder = new AudioRecorder({ customCommand: mockCmd });

    await recorder.startRecording();
    assert.equal(recorder.isRecording(), true);

    const buffer = await recorder.stopRecording();
    assert.ok(buffer.length > 0);
    assert.equal(recorder.isRecording(), false);
  });
});
