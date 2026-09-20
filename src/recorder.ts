import { spawn, execSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface RecorderOptions {
  customCommand?: string;
}

export class AudioRecorder {
  private currentProcess: ChildProcess | null = null;
  private currentTmpFile: string | null = null;
  private detectedRecorder: string | null = null;
  private customCommand?: string;

  constructor(options: RecorderOptions = {}) {
    this.customCommand = options.customCommand;
  }

  public detectRecorder(): string | null {
    if (this.customCommand) return this.customCommand;
    if (this.detectedRecorder) return this.detectedRecorder;

    const candidates = ["pw-record", "arecord", "rec", "sox"];
    for (const cmd of candidates) {
      try {
        execSync(`which ${cmd} 2>/dev/null`, { stdio: "ignore" });
        this.detectedRecorder = cmd;
        return cmd;
      } catch {
        // continue
      }
    }
    return null;
  }

  public isRecording(): boolean {
    return this.currentProcess !== null && !this.currentProcess.killed;
  }

  /**
   * Starts recording from the microphone into a temporary 16kHz WAV file.
   */
  public async startRecording(): Promise<string> {
    if (this.isRecording()) {
      throw new Error("Ya hay una grabación en curso.");
    }

    const recorder = this.detectRecorder();
    if (!recorder) {
      throw new Error(
        "No se encontró una utilidad de grabación de audio en el sistema (ej. pw-record, arecord)."
      );
    }

    const tmpFile = path.join(
      os.tmpdir(),
      `pi-record-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`
    );
    this.currentTmpFile = tmpFile;

    return new Promise<string>((resolve, reject) => {
      try {
        let child: ChildProcess;

        if (this.customCommand) {
          const cmdStr = this.customCommand.includes("$FILE")
            ? this.customCommand.replace("$FILE", JSON.stringify(tmpFile))
            : `${this.customCommand} ${JSON.stringify(tmpFile)}`;
          child = spawn(cmdStr, { shell: true, stdio: "ignore" });
        } else if (recorder === "pw-record") {
          child = spawn(
            "pw-record",
            ["--rate", "16000", "--channels", "1", "--format", "s16", tmpFile],
            { stdio: "ignore" }
          );
        } else if (recorder === "arecord") {
          child = spawn(
            "arecord",
            ["-f", "S16_LE", "-r", "16000", "-c", "1", tmpFile],
            { stdio: "ignore" }
          );
        } else {
          // sox / rec fallback
          child = spawn("rec", ["-r", "16000", "-c", "1", tmpFile], { stdio: "ignore" });
        }

        this.currentProcess = child;

        child.on("error", (err) => {
          this.cleanup();
          reject(err);
        });

        // Resolve after brief startup tick confirming process spawned
        setTimeout(() => {
          if (this.isRecording()) {
            resolve(tmpFile);
          } else {
            resolve(tmpFile);
          }
        }, 100);
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Stops recording and returns the recorded WAV audio Buffer.
   */
  public async stopRecording(): Promise<Buffer> {
    const file = this.currentTmpFile;
    const proc = this.currentProcess;

    if (!proc || !file) {
      throw new Error("No hay ninguna grabación activa para detener.");
    }

    return new Promise<Buffer>((resolve, reject) => {
      const finish = async () => {
        this.currentProcess = null;
        this.currentTmpFile = null;

        // Small delay to ensure file write buffer drains
        await new Promise((r) => setTimeout(r, 150));

        try {
          if (fs.existsSync(file)) {
            const buf = await fs.promises.readFile(file);
            fs.promises.unlink(file).catch(() => {});
            resolve(buf);
          } else {
            reject(new Error("No se generó el archivo de audio de la grabación."));
          }
        } catch (err) {
          fs.promises.unlink(file).catch(() => {});
          reject(err);
        }
      };

      let closed = false;
      proc.once("close", () => {
        closed = true;
        finish();
      });

      try {
        proc.kill("SIGINT"); // SIGINT gracefully flushes WAV headers in pw-record & arecord
      } catch {
        finish();
        return;
      }

      // Force kill fallback if process hangs
      setTimeout(() => {
        if (!closed) {
          try {
            proc.kill("SIGKILL");
          } catch {
            // ignore
          }
          finish();
        }
      }, 500);
    });
  }

  /**
   * Cancels and deletes ongoing recording without processing.
   */
  public cancelRecording(): void {
    if (this.currentProcess && !this.currentProcess.killed) {
      try {
        this.currentProcess.kill("SIGKILL");
      } catch {
        // ignore
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
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
