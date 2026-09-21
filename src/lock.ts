import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export type ConcurrencyMode = "queue" | "interrupt" | "focus" | "off";

export class FocusSuppressionError extends Error {
  constructor(message: string = "Audio playback suppressed: session is not in focus") {
    super(message);
    this.name = "FocusSuppressionError";
  }
}

export interface LockMetadata {
  sessionPid: number;
  playerPid?: number;
  createdAt: number;
  heartbeat: number;
  maxDurationMs: number;
}

export interface PlaybackLockOptions {
  ipcDir?: string;
  mode?: ConcurrencyMode;
  maxDurationMs?: number;
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
}

/**
 * Returns the IPC directory path namespaced to the current system user.
 */
export function getIpcDirectory(): string {
  let username = "user";
  try {
    username = os.userInfo().username;
  } catch {
    username = process.env.USER || process.env.LOGNAME || "user";
  }
  return path.join(os.tmpdir(), `pi-voice-${username}`);
}

/**
 * Checks if a process with the given PID is currently alive using signal 0.
 */
export function isPidAlive(pid?: number): boolean {
  if (!pid || typeof pid !== "number" || isNaN(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    // EPERM means the process exists but we lack permissions to kill it
    return err.code === "EPERM";
  }
}

const activeManagers = new Set<PlaybackLockManager>();
let exitHandlersRegistered = false;

function ensureExitHandlers(): void {
  if (exitHandlersRegistered) return;
  exitHandlersRegistered = true;

  process.on("exit", () => {
    for (const manager of activeManagers) {
      manager.releaseSync();
    }
  });

  const handleSignal = (_sig: string, code: number) => {
    for (const manager of activeManagers) {
      manager.releaseSync();
    }
    if (!process.env.NODE_TEST_CONTEXT) {
      process.exit(code);
    }
  };

  process.once("SIGINT", () => handleSignal("SIGINT", 130));
  process.once("SIGTERM", () => handleSignal("SIGTERM", 143));
}

/**
 * Coordinates inter-process audio playback across multiple Pi sessions.
 */
export class PlaybackLockManager {
  private ipcDir: string;
  private lockFile: string;
  private queueDir: string;
  private activeSessionFile: string;
  private lastInteractionTimestamp: number;
  private mode: ConcurrencyMode;
  private maxDurationMs: number;
  private pollIntervalMs: number;
  private heartbeatIntervalMs: number;

  private isHeldByMe: boolean = false;
  private leaseDepth: number = 0;
  private currentPlayerPid?: number;
  private currentTicketPath?: string;
  private heartbeatTimer?: NodeJS.Timeout;
  private waitCancelled: boolean = false;

  constructor(options: PlaybackLockOptions = {}) {
    this.ipcDir = options.ipcDir ?? getIpcDirectory();
    this.lockFile = path.join(this.ipcDir, "playback.lock");
    this.queueDir = path.join(this.ipcDir, "queue");
    this.activeSessionFile = path.join(this.ipcDir, "active_session.json");
    this.lastInteractionTimestamp = Date.now();
    this.mode = options.mode ?? "queue";
    this.maxDurationMs = options.maxDurationMs ?? 60_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 50;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 2_000;

    this.ensureDirectoriesSync();
    activeManagers.add(this);
    ensureExitHandlers();
  }

  public getIpcDir(): string {
    return this.ipcDir;
  }

  public getLockFilePath(): string {
    return this.lockFile;
  }

  public getQueueDirPath(): string {
    return this.queueDir;
  }

  public getActiveSessionFilePath(): string {
    return this.activeSessionFile;
  }

  public getLastInteractionTimestamp(): number {
    return this.lastInteractionTimestamp;
  }

  /**
   * Atomically records the current process as the actively focused Pi session.
   */
  public recordActiveSession(): void {
    const now = Date.now();
    this.lastInteractionTimestamp = now;
    this.ensureDirectoriesSync();
    const tmp = path.join(
      this.ipcDir,
      `active_session.${process.pid}.${now}.${Math.random().toString(36).slice(2)}.tmp`
    );
    try {
      fs.writeFileSync(tmp, JSON.stringify({ pid: process.pid, timestamp: now }), "utf-8");
      fs.renameSync(tmp, this.activeSessionFile);
    } catch {
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Reads and parses the active session record if present and valid.
   */
  public getActiveSession(): { pid: number; timestamp: number } | null {
    try {
      if (!fs.existsSync(this.activeSessionFile)) return null;
      const raw = fs.readFileSync(this.activeSessionFile, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.pid === "number" && typeof parsed.timestamp === "number") {
        return { pid: parsed.pid, timestamp: parsed.timestamp };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Checks whether this session is currently focused (owns the active record or dead PID / same PID).
   */
  public isFocusedSession(): boolean {
    const active = this.getActiveSession();
    if (!active) return true;
    if (active.pid === process.pid) return true;
    if (!isPidAlive(active.pid)) return true;
    return false;
  }

  public getMode(): ConcurrencyMode {
    return this.mode;
  }

  public setMode(mode: ConcurrencyMode): void {
    this.mode = mode;
  }

  public isHeldByCurrentSession(): boolean {
    return this.isHeldByMe;
  }

  public getLeaseDepth(): number {
    return this.leaseDepth;
  }

  private ensureDirectoriesSync(): void {
    try {
      if (!fs.existsSync(this.ipcDir)) {
        fs.mkdirSync(this.ipcDir, { recursive: true });
      }
      if (!fs.existsSync(this.queueDir)) {
        fs.mkdirSync(this.queueDir, { recursive: true });
      }
    } catch {
      // ignore
    }
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.promises.mkdir(this.ipcDir, { recursive: true });
      await fs.promises.mkdir(this.queueDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  private writeLockMetadataAtomic(data: LockMetadata): void {
    const tmp = `${this.lockFile}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, this.lockFile);
    } catch {
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Sets the active child player PID in memory and updates the lock file if held.
   */
  public async setPlayerPid(playerPid?: number): Promise<void> {
    this.currentPlayerPid = playerPid;
    if (this.isHeldByMe && fs.existsSync(this.lockFile)) {
      try {
        const raw = fs.readFileSync(this.lockFile, "utf-8");
        let data: LockMetadata;
        try {
          data = JSON.parse(raw);
        } catch {
          data = {
            sessionPid: process.pid,
            createdAt: Date.now(),
            heartbeat: Date.now(),
            maxDurationMs: this.maxDurationMs,
          };
        }
        if (data.sessionPid === process.pid) {
          data.playerPid = playerPid;
          data.heartbeat = Date.now();
          this.writeLockMetadataAtomic(data);
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Checks whether the current lock file is stale (dead session PID, heartbeat or max duration expired).
   */
  public async isLockStale(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.lockFile)) return false;
      const raw = await fs.promises.readFile(this.lockFile, "utf-8");
      const data: LockMetadata = JSON.parse(raw);

      // Dead session PID
      if (data.sessionPid && !isPidAlive(data.sessionPid)) {
        return true;
      }

      const now = Date.now();

      // Heartbeat timeout (3x interval or min 6000ms)
      const heartbeatExpiry = Math.max(6000, this.heartbeatIntervalMs * 3);
      if (data.heartbeat && now - data.heartbeat > heartbeatExpiry) {
        return true;
      }

      // Max duration expired
      if (data.createdAt && data.maxDurationMs && now - data.createdAt > data.maxDurationMs) {
        return true;
      }

      return false;
    } catch {
      // Corrupt or unparseable lock file is considered stale
      return true;
    }
  }

  /**
   * Unlinks the lock file if it is detected as stale. Returns true if healed.
   */
  public async autoHealStaleLock(): Promise<boolean> {
    if (await this.isLockStale()) {
      try {
        await fs.promises.unlink(this.lockFile);
        return true;
      } catch (err: any) {
        if (err.code !== "ENOENT") {
          // ignore
        }
      }
    }
    return false;
  }

  /**
   * Cancels any pending queue wait and cleans up ticket file.
   */
  public cancelWait(): void {
    this.waitCancelled = true;
    if (this.currentTicketPath) {
      try {
        fs.unlinkSync(this.currentTicketPath);
      } catch {
        // ignore
      }
      this.currentTicketPath = undefined;
    }
  }

  /**
   * Acquires the playback lock according to the selected concurrency mode.
   * Returns an async release function.
   */
  public async acquire(
    modeOverride?: ConcurrencyMode,
    signal?: AbortSignal
  ): Promise<() => Promise<void>> {
    const effectiveMode = modeOverride ?? this.mode;

    // Mode "off": completely bypass locking
    if (effectiveMode === "off") {
      return async () => {};
    }

    // Re-entrant lease holding for current session
    if (this.isHeldByMe) {
      this.leaseDepth++;
      return async () => {
        await this.release();
      };
    }

    if (signal?.aborted) {
      const err = new Error("Playback lock acquisition aborted");
      err.name = "AbortError";
      throw err;
    }

    await this.ensureDirectories();
    this.waitCancelled = false;

    if (effectiveMode === "interrupt") {
      return this.acquireInterrupt();
    }

    if (effectiveMode === "focus") {
      if (!this.isFocusedSession()) {
        throw new FocusSuppressionError();
      }
      return this.acquireInterrupt();
    }

    return this.acquireQueue(signal);
  }

  private async acquireInterrupt(): Promise<() => Promise<void>> {
    // If lock exists, inspect playerPid and sessionPid
    if (fs.existsSync(this.lockFile)) {
      try {
        const raw = await fs.promises.readFile(this.lockFile, "utf-8");
        const data: LockMetadata = JSON.parse(raw);

        if (data.sessionPid === process.pid) {
          this.isHeldByMe = true;
          this.leaseDepth = 1;
          return async () => {
            await this.release();
          };
        }

        if (data.playerPid && isPidAlive(data.playerPid)) {
          try {
            process.kill(data.playerPid, "SIGTERM");
            await new Promise((r) => setTimeout(r, 40));
            if (isPidAlive(data.playerPid)) {
              process.kill(data.playerPid, "SIGKILL");
            }
          } catch {
            // ignore kill errors
          }
        }
      } catch {
        // ignore read/parse errors
      }

      try {
        await fs.promises.unlink(this.lockFile);
      } catch (err: any) {
        if (err.code !== "ENOENT") {
          // ignore
        }
      }
    }

    // Atomic acquisition
    const metadata: LockMetadata = {
      sessionPid: process.pid,
      playerPid: this.currentPlayerPid,
      createdAt: Date.now(),
      heartbeat: Date.now(),
      maxDurationMs: this.maxDurationMs,
    };

    let acquired = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await fs.promises.writeFile(this.lockFile, JSON.stringify(metadata), { flag: "wx" });
        acquired = true;
        break;
      } catch (err: any) {
        if (err.code === "EEXIST") {
          await this.autoHealStaleLock();
          await new Promise((r) => setTimeout(r, 20));
        } else {
          throw err;
        }
      }
    }

    if (!acquired) {
      // Force write if contention
      await fs.promises.writeFile(this.lockFile, JSON.stringify(metadata));
    }

    this.isHeldByMe = true;
    this.leaseDepth = 1;
    this.startHeartbeat();

    return async () => {
      await this.release();
    };
  }

  private async acquireQueue(signal?: AbortSignal): Promise<() => Promise<void>> {
    const randomHex = crypto.randomBytes(4).toString("hex");
    const timestampStr = String(Date.now()).padStart(16, "0");
    const ticketName = `${timestampStr}-${process.pid}-${randomHex}.req`;
    const ticketPath = path.join(this.queueDir, ticketName);
    this.currentTicketPath = ticketPath;

    // Create ticket file
    await fs.promises.writeFile(
      ticketPath,
      JSON.stringify({ pid: process.pid, createdAt: Date.now() })
    );

    const cleanupTicket = async () => {
      if (this.currentTicketPath === ticketPath) {
        this.currentTicketPath = undefined;
      }
      try {
        await fs.promises.unlink(ticketPath);
      } catch {
        // ignore
      }
    };

    try {
      while (true) {
        if (signal?.aborted) {
          await cleanupTicket();
          const err = new Error("Playback lock queue wait aborted");
          err.name = "AbortError";
          throw err;
        }

        if (this.waitCancelled) {
          await cleanupTicket();
          throw new Error("Playback queue wait cancelled");
        }

        // List and purge dead tickets
        const files = await fs.promises.readdir(this.queueDir);
        const reqFiles = files.filter((f) => f.endsWith(".req"));
        const validTickets: string[] = [];

        for (const file of reqFiles) {
          const parts = file.replace(/\.req$/, "").split("-");
          const ticketPid = parseInt(parts[1], 10);
          if (ticketPid && !isPidAlive(ticketPid)) {
            // Purge dead ticket
            await fs.promises.unlink(path.join(this.queueDir, file)).catch(() => {});
          } else {
            validTickets.push(file);
          }
        }

        // Sort lexicographically for strict FIFO order
        validTickets.sort();

        const isHeadOfQueue = validTickets.length === 0 || validTickets[0] === ticketName;

        if (isHeadOfQueue) {
          // Check if lock file exists
          if (fs.existsSync(this.lockFile)) {
            const healed = await this.autoHealStaleLock();
            if (!healed) {
              // Lock still actively held by previous session
              await this.sleep(this.pollIntervalMs, signal);
              continue;
            }
          }

          // Try atomic acquisition
          const metadata: LockMetadata = {
            sessionPid: process.pid,
            playerPid: this.currentPlayerPid,
            createdAt: Date.now(),
            heartbeat: Date.now(),
            maxDurationMs: this.maxDurationMs,
          };

          try {
            await fs.promises.writeFile(this.lockFile, JSON.stringify(metadata), { flag: "wx" });
            // Lock acquired!
            await cleanupTicket();
            this.isHeldByMe = true;
            this.leaseDepth = 1;
            this.startHeartbeat();

            return async () => {
              await this.release();
            };
          } catch (err: any) {
            if (err.code === "EEXIST") {
              await this.autoHealStaleLock();
              await this.sleep(this.pollIntervalMs, signal);
              continue;
            }
            throw err;
          }
        } else {
          // Not head of queue; check stale lock anyway in case holding session died
          await this.autoHealStaleLock();
          await this.sleep(this.pollIntervalMs, signal);
        }
      }
    } catch (err) {
      await cleanupTicket();
      throw err;
    }
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        const err = new Error("Aborted");
        err.name = "AbortError";
        return reject(err);
      }
      const timeout = setTimeout(resolve, ms);
      if (signal) {
        const onAbort = () => {
          clearTimeout(timeout);
          signal.removeEventListener("abort", onAbort);
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        };
        signal.addEventListener("abort", onAbort);
      }
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.isHeldByMe) return;
      try {
        if (fs.existsSync(this.lockFile)) {
          const raw = fs.readFileSync(this.lockFile, "utf-8");
          let data: LockMetadata;
          try {
            data = JSON.parse(raw);
          } catch {
            data = {
              sessionPid: process.pid,
              createdAt: Date.now(),
              heartbeat: Date.now(),
              maxDurationMs: this.maxDurationMs,
            };
          }
          if (data.sessionPid === process.pid) {
            data.heartbeat = Date.now();
            if (this.currentPlayerPid) {
              data.playerPid = this.currentPlayerPid;
            }
            this.writeLockMetadataAtomic(data);
          }
        }
      } catch {
        // ignore
      }
    }, this.heartbeatIntervalMs);

    this.heartbeatTimer.unref();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Releases the held lock. If multiple re-entrant leases were acquired,
   * decrements the lease depth unless force is true.
   */
  public async release(force: boolean = false): Promise<void> {
    if (!this.isHeldByMe) {
      return;
    }

    if (!force && this.leaseDepth > 1) {
      this.leaseDepth--;
      return;
    }

    this.releaseSync();
  }

  /**
   * Synchronous release for process exit and signal termination handlers.
   */
  public releaseSync(): void {
    this.stopHeartbeat();
    this.currentPlayerPid = undefined;
    if (this.isHeldByMe && fs.existsSync(this.lockFile)) {
      try {
        let shouldUnlink = true;
        try {
          const raw = fs.readFileSync(this.lockFile, "utf-8");
          if (raw.trim()) {
            const data: LockMetadata = JSON.parse(raw);
            if (data.sessionPid && data.sessionPid !== process.pid) {
              shouldUnlink = false;
            }
          }
        } catch {
          shouldUnlink = true;
        }

        if (shouldUnlink) {
          fs.unlinkSync(this.lockFile);
        }
      } catch {
        // ignore
      }
    }

    if (this.currentTicketPath && fs.existsSync(this.currentTicketPath)) {
      try {
        fs.unlinkSync(this.currentTicketPath);
      } catch {
        // ignore
      }
      this.currentTicketPath = undefined;
    }

    this.isHeldByMe = false;
    this.leaseDepth = 0;
  }

  public dispose(): void {
    activeManagers.delete(this);
    this.releaseSync();
  }
}
