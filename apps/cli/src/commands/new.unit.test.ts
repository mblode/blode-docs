import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXIT_CODES } from "../errors.js";
import { registerNewCommand } from "./new.js";

const { clackLog, confirmMock, selectMock, textMock } = vi.hoisted(() => ({
  clackLog: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  confirmMock: vi.fn(),
  selectMock: vi.fn(),
  textMock: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  confirm: confirmMock,
  intro: vi.fn(),
  isCancel: (value: unknown) => value === "__cancelled__",
  log: clackLog,
  select: selectMock,
  spinner: () => ({ message: vi.fn(), start: vi.fn(), stop: vi.fn() }),
  text: textMock,
}));

const originalStdinTTY = process.stdin.isTTY;
const originalStdoutTTY = process.stdout.isTTY;

const setTTY = (
  stream: NodeJS.ReadStream | NodeJS.WriteStream,
  value: boolean | undefined
): void => {
  Object.defineProperty(stream, "isTTY", { configurable: true, value });
};

const runNewCommand = async (args: string[]): Promise<void> => {
  const program = new Command();
  program.exitOverride();
  registerNewCommand(program);
  await program.parseAsync(["new", ...args], { from: "user" });
};

let nonEmptyDirectory = "";

beforeEach(async () => {
  vi.clearAllMocks();
  nonEmptyDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "blodemd-new-"));
  await fs.writeFile(path.join(nonEmptyDirectory, "keep.txt"), "keep", "utf8");
  process.exitCode = 0;
});

afterEach(async () => {
  vi.restoreAllMocks();
  setTTY(process.stdin, originalStdinTTY);
  setTTY(process.stdout, originalStdoutTTY);
  await fs.rm(nonEmptyDirectory, { force: true, recursive: true });
  process.exitCode = 0;
});

describe("new cancellation", () => {
  it("exits CANCELLED when the operator declines a non-empty directory", async () => {
    setTTY(process.stdin, true);
    setTTY(process.stdout, true);
    confirmMock.mockResolvedValue(false);

    await runNewCommand([nonEmptyDirectory]);

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(clackLog.warn).toHaveBeenCalledWith("Cancelled");
    expect(process.exitCode).toBe(EXIT_CODES.CANCELLED);
    await expect(
      fs.access(path.join(nonEmptyDirectory, "docs.json"))
    ).rejects.toThrow();
  });

  it("exits CANCELLED when the prompt is aborted", async () => {
    setTTY(process.stdin, true);
    setTTY(process.stdout, true);
    confirmMock.mockResolvedValue("__cancelled__");

    await runNewCommand([nonEmptyDirectory]);

    expect(process.exitCode).toBe(EXIT_CODES.CANCELLED);
  });

  it("never prompts when stdin is piped even though stdout is a TTY", async () => {
    setTTY(process.stdin, false);
    setTTY(process.stdout, true);
    vi.spyOn(process.stderr, "write").mockReturnValue(true);

    await runNewCommand([nonEmptyDirectory]);

    expect(confirmMock).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(EXIT_CODES.ERROR);
  });
});
