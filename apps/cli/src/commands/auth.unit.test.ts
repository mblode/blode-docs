import { Command } from "commander";
import { afterEach, describe, expect, it, vi } from "vitest";

import type * as authSession from "../auth-session.js";
import { resolveApiKeyCredential } from "../auth-session.js";
import { EXIT_CODES } from "../errors.js";
import { registerAuthCommands } from "./auth.js";

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
  registerAuthCommands(program);

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

describe("resolveApiKeyCredential", () => {
  it("prefers the flag over the environment", () => {
    setApiKey("from-env");
    expect(resolveApiKeyCredential("from-flag")).toBe("from-flag");
  });

  it("falls back to the environment and trims it", () => {
    setApiKey("  from-env  ");
    expect(resolveApiKeyCredential()).toBe("from-env");
  });

  it("treats a blank value as unset so the session wins", () => {
    setApiKey("   ");
    expect(resolveApiKeyCredential()).toBeUndefined();
  });
});

describe("whoami --json", () => {
  it("reports the stored session when no API key is set", async () => {
    goNonInteractive();
    setApiKey(undefined);
    resolveAuthTokenMock.mockResolvedValue({
      expiresAt: "2099-01-01T00:00:00.000Z",
      source: "stored",
      token: "session-token",
      user: { email: "carol@example.com", id: "user-1" },
    });

    const { exitCode, stdout } = await runCli(["whoami", "--json"]);

    expect(JSON.parse(stdout)).toEqual({
      email: "carol@example.com",
      expiresAt: "2099-01-01T00:00:00.000Z",
      loggedIn: true,
      source: "session",
    });
    expect(stdout.trimEnd().split("\n")).toHaveLength(1);
    expect(exitCode).toBeFalsy();
  });

  it("reports the API key from the environment, ignoring the stored session", async () => {
    goNonInteractive();
    setApiKey("bogus");
    resolveAuthTokenMock.mockResolvedValue({
      expiresAt: null,
      source: "stored",
      token: "session-token",
      user: { email: "carol@example.com", id: "user-1" },
    });

    const { stderr, stdout } = await runCli(["whoami", "--json"]);

    expect(JSON.parse(stdout)).toEqual({
      email: null,
      expiresAt: null,
      loggedIn: true,
      source: "api-key",
    });
    // The credential push would use is never resolved from disk.
    expect(resolveAuthTokenMock).not.toHaveBeenCalled();
    expect(stderr).toContain("BLODEMD_API_KEY");
  });

  it("reports the --api-key flag as the source", async () => {
    goNonInteractive();
    setApiKey(undefined);

    const { stderr, stdout } = await runCli([
      "whoami",
      "--json",
      "--api-key",
      "bmd_flag",
    ]);

    expect(JSON.parse(stdout).source).toBe("api-key");
    expect(stderr).toContain("--api-key");
  });

  it("reports loggedIn false and exits AUTH_REQUIRED with no credential", async () => {
    goNonInteractive();
    setApiKey(undefined);
    resolveAuthTokenMock.mockResolvedValue(null);

    const { exitCode, stdout } = await runCli(["whoami", "--json"]);

    expect(JSON.parse(stdout)).toEqual({
      email: null,
      expiresAt: null,
      loggedIn: false,
      source: "session",
    });
    expect(exitCode).toBe(EXIT_CODES.AUTH_REQUIRED);
  });
});

describe("whoami (human output)", () => {
  it("sends prose to stderr when piped, keeping stdout parseable", async () => {
    goNonInteractive();
    setApiKey(undefined);
    resolveAuthTokenMock.mockResolvedValue({
      expiresAt: null,
      source: "stored",
      token: "session-token",
      user: { email: "carol@example.com", id: "user-1" },
    });

    const { stderr, stdout } = await runCli(["whoami"]);

    // Piped stdout carries the payload and nothing else: no clack box-drawing
    // glyphs, no prose.
    expect(JSON.parse(stdout).email).toBe("carol@example.com");
    expect(stdout).not.toMatch(/[\u2500-\u257F\u25A0-\u25FF]/);
    expect(stderr).toContain("carol@example.com");
    expect(logMock.info).not.toHaveBeenCalled();
    expect(introMock).not.toHaveBeenCalled();
  });
});
