import { spawn, execSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface PlayerOptions {
  customCommand?: string;
  volume?: number;
}

export class AudioPlayer {
  private currentProcess: ChildProcess | null = null;
  private currentTmpFile: string | null = null;
  private detectedPlayer: string | null = null;
  private customCommand?: string;
  private volume: number = 1.0;

  constructor(options: PlayerOptions = {}) {
    this.customCommand = options.customCommand;
    if (typeof options.volume === "number") {
      this.setVolume(options.volume);
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0.0, Math.min(1.5, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Adjusts the volume of 16-bit PCM WAV audio samples in-place.
   */
  public static adjustWavVolume(wavBuffer: Buffer, volume: number): Buffer {
    if (volume === 1.0) return wavBuffer;
    if (wavBuffer.toString("ascii", 0, 4) !== "RIFF") return wavBuffer;
    let offset = 12;
    while (offset < wavBuffer.length - 8) {
      const chunkId = wavBuffer.toString("ascii", offset, offset + 4);
      const chunkSize = wavBuffer.readUInt32LE(offset + 4);
      if (chunkId === "data") {
        const copy = Buffer.from(wavBuffer);
        const dataStart = offset + 8;
        const dataEnd = Math.min(dataStart + chunkSize, copy.length);
        for (let i = dataStart; i < dataEnd - 1; i += 2) {
          let sample = copy.readInt16LE(i);
          sample = Math.round(sample * volume);
          sample = Math.max(-32768, Math.min(32767, sample));
          copy.writeInt16LE(sample, i);
        }
        return copy;
      }
      offset += 8 + chunkSize;
    }
    return wavBuffer;
  }

  public setCustomCommand(cmd?: string): void {
    this.customCommand = cmd;
    this.detectedPlayer = null; // reset cached detection
  }

  /**
   * Detects the best available audio player binary in the system.
   */
  public detectPlayer(): string | null {
    if (this.customCommand) {
      return this.customCommand;
    }

    if (this.detectedPlayer) {
      return this.detectedPlayer;
    }

    const platform = os.platform();

    if (platform === "darwin") {
      // macOS afplay
      if (this.hasCommand("afplay")) {
        this.detectedPlayer = "afplay";
        return "afplay";
      }
    } else if (platform === "win32") {
      if (this.hasCommand("mpv")) return (this.detectedPlayer = "mpv");
      if (this.hasCommand("ffplay")) return (this.detectedPlayer = "ffplay");
      return (this.detectedPlayer = "powershell");
    } else {
      // Linux / Unix
      const candidates = ["pw-play", "paplay", "aplay", "mpv", "ffplay"];
      for (const cmd of candidates) {
        if (this.hasCommand(cmd)) {
          this.detectedPlayer = cmd;
          return cmd;
        }
      }
    }

    return null;
  }

  public hasCommand(cmd: string): boolean {
    try {
      execSync(`which ${cmd} 2>/dev/null`, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  public isPlaying(): boolean {
    return this.currentProcess !== null && !this.currentProcess.killed;
  }

  /**
   * Plays the given audio buffer using the detected or configured player.
   * Cancels any previously running playback before starting.
   */
  public async play(audioBuffer: Buffer, format: string = "wav"): Promise<void> {
    this.stop();

    const player = this.detectPlayer();
    if (!player) {
      throw new Error(
        "No se encontró un reproductor de audio compatible en el sistema (ej. pw-play, aplay, afplay, mpv)."
      );
    }

    // Write to a temporary file
    const ext = format.startsWith(".") ? format : `.${format}`;
    const tmpFile = path.join(
      os.tmpdir(),
      `pi-voice-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    );

    // Apply volume scaling if WAV
    const bufferToPlay =
      format === "wav" || format === ".wav"
        ? AudioPlayer.adjustWavVolume(audioBuffer, this.volume)
        : audioBuffer;

    await fs.promises.writeFile(tmpFile, bufferToPlay);
    this.currentTmpFile = tmpFile;

    return new Promise<void>((resolve, reject) => {
      try {
        let child: ChildProcess;

        if (this.customCommand) {
          // If custom command with args, run via shell with placeholder or file append
          const commandStr = this.customCommand.includes("$FILE")
            ? this.customCommand.replace("$FILE", JSON.stringify(tmpFile))
            : `${this.customCommand} ${JSON.stringify(tmpFile)}`;
          child = spawn(commandStr, { shell: true, stdio: "ignore" });
        } else if (player === "powershell") {
          const psScript = `(New-Object Media.SoundPlayer ${JSON.stringify(tmpFile)}).PlaySync();`;
          child = spawn("powershell", ["-NoProfile", "-Command", psScript], {
            stdio: "ignore",
          });
        } else {
          // Standard direct spawn
          child = spawn(player, [tmpFile], { stdio: "ignore" });
        }

        this.currentProcess = child;

        const cleanup = () => {
          if (this.currentProcess === child) {
            this.currentProcess = null;
          }
          if (this.currentTmpFile === tmpFile) {
            this.currentTmpFile = null;
          }
          fs.promises.unlink(tmpFile).catch(() => {});
        };

        child.on("error", (err) => {
          cleanup();
          reject(err);
        });

        child.on("close", (code) => {
          cleanup();
          if (code === 0 || code === null) {
            resolve();
          } else {
            // Non-zero exit code might be normal if process was SIGTERM-killed
            resolve();
          }
        });
      } catch (err) {
        if (this.currentTmpFile === tmpFile) {
          this.currentTmpFile = null;
        }
        fs.promises.unlink(tmpFile).catch(() => {});
        reject(err);
      }
    });
  }

  /**
   * Immediately stops any currently playing audio and deletes the temporary file.
   */
  public stop(): void {
    if (this.currentProcess && !this.currentProcess.killed) {
      try {
        this.currentProcess.kill("SIGTERM");
        // Force kill after 100ms if still running
        setTimeout(() => {
          if (this.currentProcess && !this.currentProcess.killed) {
            try {
              this.currentProcess.kill("SIGKILL");
            } catch {
              // ignore
            }
          }
        }, 100);
      } catch {
        // ignore
      }
    }
    this.currentProcess = null;

    if (this.currentTmpFile) {
      try {
        fs.unlinkSync(this.currentTmpFile);
      } catch {
        // ignore
      }
      this.currentTmpFile = null;
    }
  }
}
