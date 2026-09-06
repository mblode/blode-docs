import { Command } from "commander";
import { afterEach, describe, expect, it, vi } from "vitest";

import type * as authSession from "../auth-session.js";
import { CliError, ERROR_CODES, EXIT_CODES } from "../errors.js";
import { registerProjectsCommand } from "./projects.js";

const {
  introMock,
  logMock,
  requestJsonMock,
  resolveAuthTokenMock,
  resolveTokenStatusMock,
  spinnerMock,
} = vi.hoisted(() => ({
  introMock: vi.fn(),
  logMock: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  requestJsonMock: vi.fn(),
  resolveAuthTokenMock: vi.fn(),
  resolveTokenStatusMock: vi.fn(() => ({
    expired: false,
    expiresInSeconds: null,
  })),
  spinnerMock: { message: vi.fn(), start: vi.fn(), stop: vi.fn() },
}));

type AuthSessionModule = typeof authSession;

vi.mock("@clack/prompts", () => ({
  intro: introMock,
  log: logMock,
  spinner: () => spinnerMock,
}));

// Partial mock: the session lookups are stubbed, but credential precedence is
// the real implementation, because these tests are asserting that behaviour.
vi.mock("../auth-session.js", async (importOriginal) => ({
  ...(await importOriginal<AuthSessionModule>()),
  resolveAuthToken: resolveAuthTokenMock,
  resolveTokenStatus: resolveTokenStatusMock,
}));

vi.mock("../http.js", () => ({ requestJson: requestJsonMock }));

const originalTTY = process.stdout.isTTY;
const originalApiKey = process.env.BLODEMD_API_KEY;

const setApiKey = (value: string | undefined): void => {
  if (value === undefined) {
    delete process.env.BLODEMD_API_KEY;
  } else {
    process.env.BLODEMD_API_KEY = value;
  }
};

const runCli = async (
  args: string[]
): Promise<{
  exitCode: number | string;
  stderr: string;
  stdout: string;
}> => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const outSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
  const errSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: unknown) => {
      stderr.push(String(chunk));
      return true;
    });

  const program = new Command();
  program.exitOverride();
  registerProjectsCommand(program);

  try {
    await program.parseAsync(args, { from: "user" });
  } finally {
    outSpy.mockRestore();
    errSpy.mockRestore();
  }

  const exitCode = process.exitCode ?? 0;
  process.exitCode = 0;
  return { exitCode, stderr: stderr.join(""), stdout: stdout.join("") };
};

afterEach(() => {
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: originalTTY,
  });
  setApiKey(originalApiKey);
  vi.clearAllMocks();
});

const goNonInteractive = (): void => {
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: false,
  });
};

describe("projects", () => {
  it("lists the session's projects as a single JSON line", async () => {
    goNonInteractive();
    setApiKey(undefined);
    resolveAuthTokenMock.mockResolvedValue({
      expiresAt: null,
      source: "stored",
      token: "session-token",
      user: { email: "carol@example.com", id: "user-1" },
    });
    requestJsonMock.mockResolvedValue([
      { id: "p1", name: "Docs", slug: "docs" },
    ]);

    const { exitCode, stdout } = await runCli(["projects", "--json"]);

    expect(JSON.parse(stdout)).toEqual([
      { id: "p1", name: "Docs", slug: "docs" },
    ]);
    expect(stdout.trimEnd().split("\n")).toHaveLength(1);
    expect(exitCode).toBeFalsy();
  });

  it("refuses to fall back to the session when BLODEMD_API_KEY takes precedence", async () => {
    goNonInteractive();
    setApiKey("bmd_env");
    resolveAuthTokenMock.mockResolvedValue({
      expiresAt: null,
      source: "stored",
      token: "session-token",
      user: { email: "carol@example.com", id: "user-1" },
    });

    const { exitCode, stdout } = await runCli(["projects", "--json"]);

    const payload = JSON.parse(stdout);
    expect(payload.error).toBe(true);
    expect(payload.code).toBe(ERROR_CODES.PERMISSION_DENIED);
    expect(payload.message).toContain("BLODEMD_API_KEY");
    expect(exitCode).toBe(EXIT_CODES.AUTH_REQUIRED);
    expect(resolveAuthTokenMock).not.toHaveBeenCalled();
    expect(requestJsonMock).not.toHaveBeenCalled();
  });

  it("names --api-key as the winning credential", async () => {
    goNonInteractive();
    setApiKey(undefined);

    const { stdout } = await runCli([
      "projects",
      "--json",
      "--api-key",
      "bmd_flag",
    ]);

    expect(JSON.parse(stdout).message).toContain("--api-key");
    expect(requestJsonMock).not.toHaveBeenCalled();
  });

  it("turns a typed 401 into a re-login instruction", async () => {
    goNonInteractive();
    setApiKey(undefined);
    resolveAuthTokenMock.mockResolvedValue({
      expiresAt: null,
      source: "stored",
      token: "stale-token",
      user: null,
    });
    requestJsonMock.mockRejectedValue(
      new CliError(
        "Failed to list projects: 401 {}",
        EXIT_CODES.AUTH_REQUIRED,
        'Run "blodemd login", or set BLODEMD_API_KEY.',
        { code: ERROR_CODES.AUTH_REQUIRED, status: 401 }
      )
    );

    const { exitCode, stdout } = await runCli(["projects", "--json"]);

    const payload = JSON.parse(stdout);
    expect(payload.code).toBe(ERROR_CODES.AUTH_REQUIRED);
    expect(payload.status).toBe(401);
    expect(payload.message).toBe("Your stored session was rejected.");
    expect(payload.hint).toBe('Run "blodemd login" to re-authenticate.');
    expect(exitCode).toBe(EXIT_CODES.AUTH_REQUIRED);
  });
});
