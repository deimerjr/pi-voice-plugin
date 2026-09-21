import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import {
  PlaybackLockManager,
  FocusSuppressionError,
  getIpcDirectory,
  isPidAlive,
  type LockMetadata,
} from "./lock.ts";

describe("PlaybackLockManager & InterProcessLock", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lock-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("getIpcDirectory returns user-namespaced directory path", () => {
    const dir = getIpcDirectory();
    assert.ok(dir.includes("pi-voice-"));
  });

  it("isPidAlive checks process liveliness accurately", () => {
    assert.equal(isPidAlive(process.pid), true);
    assert.equal(isPidAlive(undefined), false);
    assert.equal(isPidAlive(0), false);
    assert.equal(isPidAlive(-1), false);
    // Large non-existent PID should be false
    assert.equal(isPidAlive(9999999), false);
  });

  it("handles atomic acquisition, re-entrant leases, and release", async () => {
    const manager = new PlaybackLockManager({ ipcDir: tmpDir, pollIntervalMs: 20 });

    assert.equal(manager.isHeldByCurrentSession(), false);
    assert.equal(manager.getLeaseDepth(), 0);

    // 1. Acquire lock
    const release1 = await manager.acquire("queue");
    assert.equal(manager.isHeldByCurrentSession(), true);
    assert.equal(manager.getLeaseDepth(), 1);

    const lockFile = manager.getLockFilePath();
    assert.equal(fs.existsSync(lockFile), true);

    const meta: LockMetadata = JSON.parse(fs.readFileSync(lockFile, "utf-8"));
    assert.equal(meta.sessionPid, process.pid);

    // 2. Re-entrant acquisition
    const release2 = await manager.acquire("queue");
    assert.equal(manager.getLeaseDepth(), 2);
    assert.equal(fs.existsSync(lockFile), true);

    // 3. Release inner lease
    await release2();
    assert.equal(manager.getLeaseDepth(), 1);
    assert.equal(manager.isHeldByCurrentSession(), true);
    assert.equal(fs.existsSync(lockFile), true);

    // 4. Release outer lease
    await release1();
    assert.equal(manager.getLeaseDepth(), 0);
    assert.equal(manager.isHeldByCurrentSession(), false);
    assert.equal(fs.existsSync(lockFile), false);

    manager.dispose();
  });

  it("recovers from stale lock when owning session PID is dead", async () => {
    const manager = new PlaybackLockManager({ ipcDir: tmpDir, pollIntervalMs: 20 });
    const lockFile = manager.getLockFilePath();

    // Create a stale lock file pointing to a dead PID
    const deadPid = 9999999;
    assert.equal(isPidAlive(deadPid), false);

    const staleMeta: LockMetadata = {
      sessionPid: deadPid,
      createdAt: Date.now() - 30_000,
      heartbeat: Date.now() - 30_000,
      maxDurationMs: 60_000,
    };
    fs.writeFileSync(lockFile, JSON.stringify(staleMeta));

    assert.equal(await manager.isLockStale(), true);

    // Manager should automatically detect dead PID, heal stale lock, and acquire
    const release = await manager.acquire("queue");
    assert.equal(manager.isHeldByCurrentSession(), true);

    const currentMeta: LockMetadata = JSON.parse(fs.readFileSync(lockFile, "utf-8"));
    assert.equal(currentMeta.sessionPid, process.pid);

    await release();
    assert.equal(fs.existsSync(lockFile), false);
    manager.dispose();
  });

  it("orders tickets using FIFO lexicographical timestamp sorting and purges dead tickets", async () => {
    const manager = new PlaybackLockManager({ ipcDir: tmpDir, pollIntervalMs: 20 });
    const queueDir = manager.getQueueDirPath();

    const deadPid = 9999998;
    const deadTicket = path.join(queueDir, "0000000000000001-9999998-dead.req");
    fs.writeFileSync(deadTicket, JSON.stringify({ pid: deadPid, createdAt: 1 }));

    // Dead ticket exists
    assert.equal(fs.existsSync(deadTicket), true);

    // Acquire lock: should purge dead ticket and successfully obtain lock
    const release = await manager.acquire("queue");
    assert.equal(fs.existsSync(deadTicket), false, "Dead ticket should have been purged");
    assert.equal(manager.isHeldByCurrentSession(), true);

    await release();
    manager.dispose();
  });

  it("interrupt mode preempts existing lock and terminates running player process", async () => {
    // Spawn a long-running dummy child process to represent a competing player
    const dummyPlayer = spawn("sleep", ["30"], { stdio: "ignore" });
    const dummyPlayerPid = dummyPlayer.pid!;
    assert.ok(dummyPlayerPid > 0);
    assert.equal(isPidAlive(dummyPlayerPid), true);

    try {
      // Simulate another session owning the lock with dummyPlayer
      const lockFile = path.join(tmpDir, "playback.lock");
      const foreignMeta: LockMetadata = {
        sessionPid: 8888888, // foreign session
        playerPid: dummyPlayerPid,
        createdAt: Date.now(),
        heartbeat: Date.now(),
        maxDurationMs: 60_000,
      };
      fs.writeFileSync(lockFile, JSON.stringify(foreignMeta));

      const manager = new PlaybackLockManager({ ipcDir: tmpDir, pollIntervalMs: 20 });

      // Acquire with "interrupt" mode
      const release = await manager.acquire("interrupt");
      assert.equal(manager.isHeldByCurrentSession(), true);

      // Verify the dummy player process was terminated
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(isPidAlive(dummyPlayerPid), false, "Competing player process should have been killed");

      // Verify lock file is now owned by current process
      const currentMeta: LockMetadata = JSON.parse(fs.readFileSync(lockFile, "utf-8"));
      assert.equal(currentMeta.sessionPid, process.pid);

      await release();
      assert.equal(fs.existsSync(lockFile), false);
      manager.dispose();
    } finally {
      try {
        dummyPlayer.kill("SIGKILL");
      } catch {
        // ignore
      }
    }
  });

  it("mode 'off' bypasses locking completely", async () => {
    const manager = new PlaybackLockManager({ ipcDir: tmpDir });
    const release = await manager.acquire("off");

    assert.equal(manager.isHeldByCurrentSession(), false);
    assert.equal(fs.existsSync(manager.getLockFilePath()), false);

    // Calling release does not throw
    await release();
    manager.dispose();
  });

  it("supports queue wait cancellation via cancelWait()", async () => {
    const manager = new PlaybackLockManager({ ipcDir: tmpDir, pollIntervalMs: 20 });

    // Hold lock from another session to keep manager waiting in queue
    const lockFile = manager.getLockFilePath();
    fs.writeFileSync(
      lockFile,
      JSON.stringify({
        sessionPid: process.pid, // current pid alive, so won't be seen as dead
        createdAt: Date.now(),
        heartbeat: Date.now() + 100_000, // future heartbeat so won't be seen as stale
        maxDurationMs: 100_000,
      })
    );

    // Create a second manager pointing to same tmpDir
    const manager2 = new PlaybackLockManager({ ipcDir: tmpDir, pollIntervalMs: 20 });

    let errorThrown: any = null;
    const waitPromise = manager2.acquire("queue").catch((err) => {
      errorThrown = err;
    });

    // Wait a tick for ticket creation
    await new Promise((r) => setTimeout(r, 60));
    manager2.cancelWait();

    await waitPromise;
    assert.ok(errorThrown !== null);
    assert.match(errorThrown.message, /cancelled/i);

    manager.dispose();
    manager2.dispose();
  });

  it("records and inspects active session focus state accurately", () => {
    const manager = new PlaybackLockManager({ ipcDir: tmpDir });

    // Initially with no file, isFocusedSession() is true
    assert.equal(manager.getActiveSession(), null);
    assert.equal(manager.isFocusedSession(), true);

    // Record current session
    manager.recordActiveSession();
    const active = manager.getActiveSession();
    assert.ok(active !== null);
    assert.equal(active.pid, process.pid);
    assert.ok(typeof active.timestamp === "number");
    assert.equal(manager.isFocusedSession(), true);

    // Overwrite with a dead foreign PID
    const deadPid = 9999991;
    assert.equal(isPidAlive(deadPid), false);
    fs.writeFileSync(
      manager.getActiveSessionFilePath(),
      JSON.stringify({ pid: deadPid, timestamp: Date.now() })
    );
    // Dead foreign PID allows current session to take focus
    assert.equal(manager.isFocusedSession(), true);

    // Overwrite with an alive foreign PID (we spawn a dummy child)
    const dummy = spawn("sleep", ["30"], { stdio: "ignore" });
    const aliveForeignPid = dummy.pid!;
    try {
      assert.equal(isPidAlive(aliveForeignPid), true);
      fs.writeFileSync(
        manager.getActiveSessionFilePath(),
        JSON.stringify({ pid: aliveForeignPid, timestamp: Date.now() })
      );

      // Now current session is NOT in focus
      assert.equal(manager.isFocusedSession(), false);

      // Recording active session reclaims focus atomically
      manager.recordActiveSession();
      assert.equal(manager.isFocusedSession(), true);
      assert.equal(manager.getActiveSession()?.pid, process.pid);
    } finally {
      dummy.kill("SIGKILL");
    }

    manager.dispose();
  });

  it("focus mode suppresses playback when session is not in focus and speaks with takeover when focused", async () => {
    const manager = new PlaybackLockManager({ ipcDir: tmpDir, pollIntervalMs: 20 });
    const dummy = spawn("sleep", ["30"], { stdio: "ignore" });
    const aliveForeignPid = dummy.pid!;

    try {
      // Simulate foreign session holding active focus
      fs.writeFileSync(
        manager.getActiveSessionFilePath(),
        JSON.stringify({ pid: aliveForeignPid, timestamp: Date.now() })
      );

      assert.equal(manager.isFocusedSession(), false);

      // acquire("focus") must throw FocusSuppressionError
      await assert.rejects(
        async () => {
          await manager.acquire("focus");
        },
        (err: any) => {
          assert.ok(err instanceof FocusSuppressionError);
          assert.equal(err.name, "FocusSuppressionError");
          assert.match(err.message, /not in focus/i);
          return true;
        }
      );

      // Lock should not be held
      assert.equal(manager.isHeldByCurrentSession(), false);

      // Reclaim focus for current session
      manager.recordActiveSession();
      assert.equal(manager.isFocusedSession(), true);

      // Now acquire("focus") succeeds and acts with takeover (interrupt)
      const release = await manager.acquire("focus");
      assert.equal(manager.isHeldByCurrentSession(), true);

      await release();
      assert.equal(manager.isHeldByCurrentSession(), false);
    } finally {
      dummy.kill("SIGKILL");
      manager.dispose();
    }
  });
});
