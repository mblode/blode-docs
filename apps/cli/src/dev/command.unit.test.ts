import { EventEmitter } from "node:events";

import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveDevPort, shutdownChildProcess } from "./command.js";

// eslint-disable-next-line unicorn/prefer-event-target
class FakeChildProcess extends EventEmitter {
  exitCode: number | null = null;
  readonly signals: (NodeJS.Signals | undefined)[] = [];
  private readonly mode: "graceful" | "stubborn";

  constructor(mode: "graceful" | "stubborn") {
    super();
    this.mode = mode;
  }

  kill = vi.fn((signal?: NodeJS.Signals) => {
    this.signals.push(signal);

    if (signal === "SIGTERM" && this.mode === "graceful") {
      queueMicrotask(() => {
        this.exitCode = 0;
        this.emit("exit", 0, signal);
      });
    }

    if (signal === "SIGKILL") {
      queueMicrotask(() => {
        this.exitCode = 1;
        this.emit("exit", 1, signal);
      });
    }

    return true;
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("resolveDevPort", () => {
  it("keeps the requested port when it is available", async () => {
    const probe = vi.fn((port: number) => Promise.resolve(port === 3030));

    await expect(resolveDevPort(3030, probe)).resolves.toBe(3030);
    expect(probe).toHaveBeenCalledWith(3030);
  });

  it("advances to the next available port when the requested port is busy", async () => {
    const probe = vi.fn((port: number) => Promise.resolve(port === 3032));

    await expect(resolveDevPort(3030, probe)).resolves.toBe(3032);
    expect(probe).toHaveBeenNthCalledWith(1, 3030);
    expect(probe).toHaveBeenNthCalledWith(2, 3031);
    expect(probe).toHaveBeenNthCalledWith(3, 3032);
  });

  it("fails after scanning the fallback window", async () => {
    const probe = vi.fn(() => Promise.resolve(false));

    await expect(resolveDevPort(3030, probe)).rejects.toThrow(
      /No available port found within 10 attempts starting at 3030\./
    );
    expect(probe).toHaveBeenCalledTimes(10);
  });
});

describe("shutdownChildProcess", () => {
  it("sends SIGTERM and resolves when the child exits cleanly", async () => {
    const child = new FakeChildProcess("graceful");

    await expect(
      shutdownChildProcess(child as never, 100)
    ).resolves.toBeUndefined();
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.signals).toEqual(["SIGTERM"]);
  });

  it("escalates to SIGKILL when the child ignores SIGTERM", async () => {
    vi.useFakeTimers();

    const child = new FakeChildProcess("stubborn");
    const shutdown = shutdownChildProcess(child as never, 50);

    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.signals).toEqual(["SIGTERM"]);

    await vi.advanceTimersByTimeAsync(50);
    await expect(shutdown).resolves.toBeUndefined();
    expect(child.kill).toHaveBeenCalledTimes(2);
    expect(child.signals).toEqual(["SIGTERM", "SIGKILL"]);
  });
});
