import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as authSession from "../auth-session.js";
import type * as CommandUtils from "../command-utils.js";
import { CliError, EXIT_CODES } from "../errors.js";
import {
  buildDryRunPayload,
  canPromptForConfirmation,
  registerPushCommand,
} from "./push.js";

const {
  clackLog,
  collectFilesMock,
  confirmMock,
  readGitValueMock,
  requestJsonMock,
  resolveAuthTokenMock,
  resolveDocsRootMock,
} = vi.hoisted(() => ({
  clackLog: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  collectFilesMock: vi.fn(),
  confirmMock: vi.fn(),
  readGitValueMock: vi.fn(),
  requestJsonMock: vi.fn(),
  resolveAuthTokenMock: vi.fn(),
  resolveDocsRootMock: vi.fn(),
}));

type AuthSessionModule = typeof authSession;

vi.mock("@clack/prompts", () => ({
  confirm: confirmMock,
  intro: vi.fn(),
  isCancel: (value: unknown) => value === "__cancelled__",
  log: clackLog,
  spinner: () => ({ message: vi.fn(), start: vi.fn(), stop: vi.fn() }),
}));

// Partial mock: the session lookup is stubbed, but credential precedence is the
// real implementation, because these tests assert that behaviour.
vi.mock("../auth-session.js", async (importOriginal) => ({
  ...(await importOriginal<AuthSessionModule>()),
  resolveAuthToken: resolveAuthTokenMock,
}));

vi.mock("../http.js", () => ({ requestJson: requestJsonMock }));

vi.mock("../dev/resolve-root.js", () => ({
  resolveDocsRoot: resolveDocsRootMock,
}));

vi.mock("../site-config.js", () => ({
  loadValidatedSiteConfig: () =>
    Promise.resolve({
      config: { name: "My Docs", slug: "my-docs" },
      warnings: [],
    }),
}));

vi.mock("../command-utils.js", async (importOriginal) => ({
  ...(await importOriginal<typeof CommandUtils>()),
  collectFiles: collectFilesMock,
  readGitValue: readGitValueMock,
}));

const DOCS_ROOT = "/tmp/blodemd-unit-docs";

const OWNED_ENV = [
  "BLODEMD_API_KEY",
  "BLODEMD_API_URL",
  "BLODEMD_BRANCH",
  "BLODEMD_COMMIT_MESSAGE",
  "BLODEMD_PROJECT",
  "CI",
  "GITHUB_REF_NAME",
];

const originalEnv = new Map(OWNED_ENV.map((key) => [key, process.env[key]]));
const originalStdinTTY = process.stdin.isTTY;
const originalStdoutTTY = process.stdout.isTTY;

const setTTY = (
  stream: NodeJS.ReadStream | NodeJS.WriteStream,
  value: boolean | undefined
): void => {
  Object.defineProperty(stream, "isTTY", { configurable: true, value });
};

const notFound = (): CliError =>
  new CliError("Failed to create deployment: 404 {}", EXIT_CODES.ERROR, "", {
    status: 404,
  });

const runPushCommand = async (args: string[]): Promise<void> => {
  const program = new Command();
  program.exitOverride();
  registerPushCommand(program);
  await program.parseAsync(["push", ...args], { from: "user" });
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of OWNED_ENV) {
    Reflect.deleteProperty(process.env, key);
  }
  resolveDocsRootMock.mockResolvedValue(DOCS_ROOT);
  collectFilesMock.mockResolvedValue([
    `${DOCS_ROOT}/docs.json`,
    `${DOCS_ROOT}/index.mdx`,
  ]);
  resolveAuthTokenMock.mockResolvedValue({ token: "session-token" });
  process.exitCode = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  setTTY(process.stdin, originalStdinTTY);
  setTTY(process.stdout, originalStdoutTTY);
  for (const [key, value] of originalEnv) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key);
    } else {
      process.env[key] = value;
    }
  }
  process.exitCode = 0;
});

describe("buildDryRunPayload", () => {
  it("describes the target without inventing a commit message", () => {
    expect(
      buildDryRunPayload({
        apiUrl: "https://api.test",
        branch: "main",
        fileCount: 3,
        project: "my-docs",
        root: "/docs",
      })
    ).toEqual({
      apiUrl: "https://api.test",
      branch: "main",
      commitMessage: null,
      dryRun: true,
      fileCount: 3,
      project: "my-docs",
      root: "/docs",
    });
  });
});

describe("canPromptForConfirmation", () => {
  it.each([
    { stdin: true, stdout: true, expected: true },
    // The audited hang: an agent pipes stdin but inherits a TTY stdout.
    { stdin: false, stdout: true, expected: false },
    { stdin: true, stdout: false, expected: false },
    { stdin: false, stdout: false, expected: false },
  ])(
    "is $expected with stdin TTY $stdin and stdout TTY $stdout",
    ({ stdin, stdout, expected }) => {
      setTTY(process.stdin, stdin);
      setTTY(process.stdout, stdout);
      expect(canPromptForConfirmation(true)).toBe(expected);
    }
  );

  it("is false when the reporter is already non-interactive", () => {
    setTTY(process.stdin, true);
    setTTY(process.stdout, true);
    expect(canPromptForConfirmation(false)).toBe(false);
  });
});

describe("push --dry-run", () => {
  it("emits one JSON line and calls no API", async () => {
    setTTY(process.stdin, false);
    setTTY(process.stdout, false);
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    vi.spyOn(process.stderr, "write").mockReturnValue(true);

    await runPushCommand([
      "--dry-run",
      "--json",
      "--project",
      "my-docs",
      "--branch",
      "main",
      "--message",
      "ship it",
      "--api-url",
      "https://api.test",
    ]);

    const lines = stdout.mock.calls.map((call) => String(call[0]));
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? "")).toEqual({
      apiUrl: "https://api.test",
      branch: "main",
      commitMessage: "ship it",
      dryRun: true,
      fileCount: 2,
      project: "my-docs",
      root: DOCS_ROOT,
    });

    expect(requestJsonMock).not.toHaveBeenCalled();
    expect(resolveAuthTokenMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(EXIT_CODES.SUCCESS);
  });
});

describe("push auto-create", () => {
  it("exits CANCELLED when the operator declines", async () => {
    setTTY(process.stdin, true);
    setTTY(process.stdout, true);
    requestJsonMock.mockRejectedValueOnce(notFound());
    confirmMock.mockResolvedValue(false);

    await runPushCommand(["--project", "my-docs", "--branch", "main"]);

    expect(confirmMock).toHaveBeenCalledTimes(1);
    // Only the deployment attempt; nothing was created.
    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(EXIT_CODES.CANCELLED);
  });

  it("exits CANCELLED when the prompt is aborted", async () => {
    setTTY(process.stdin, true);
    setTTY(process.stdout, true);
    requestJsonMock.mockRejectedValueOnce(notFound());
    confirmMock.mockResolvedValue("__cancelled__");

    await runPushCommand(["--project", "my-docs", "--branch", "main"]);

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(EXIT_CODES.CANCELLED);
  });

  it("never prompts when stdin is piped even though stdout is a TTY", async () => {
    setTTY(process.stdin, false);
    setTTY(process.stdout, true);
    requestJsonMock.mockRejectedValueOnce(notFound());

    await runPushCommand(["--project", "my-docs", "--branch", "main"]);

    expect(confirmMock).not.toHaveBeenCalled();
    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(EXIT_CODES.ERROR);
    expect(clackLog.error).toHaveBeenCalledWith(
      expect.stringContaining("--yes")
    );
  });

  it("creates the project without prompting under --yes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "blodemd-push-"));
    await fs.writeFile(path.join(root, "index.mdx"), "# Hi\n", "utf8");
    resolveDocsRootMock.mockResolvedValue(root);
    collectFilesMock.mockResolvedValue([path.join(root, "index.mdx")]);

    setTTY(process.stdin, false);
    setTTY(process.stdout, false);
    vi.spyOn(process.stdout, "write").mockReturnValue(true);
    vi.spyOn(process.stderr, "write").mockReturnValue(true);

    requestJsonMock
      .mockRejectedValueOnce(notFound())
      .mockResolvedValueOnce({ id: "proj_1", slug: "my-docs" })
      .mockResolvedValueOnce({ key: "blode_deploy_key" })
      .mockResolvedValueOnce({ id: "dep_1" })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ fileCount: 1, id: "dep_1" });

    await runPushCommand([
      "--yes",
      "--json",
      "--project",
      "my-docs",
      "--branch",
      "main",
      "--api-url",
      "https://api.test",
    ]);

    expect(confirmMock).not.toHaveBeenCalled();
    expect(requestJsonMock.mock.calls[1]?.[0]).toBe(
      "https://api.test/projects"
    );
    expect(process.exitCode).toBe(EXIT_CODES.SUCCESS);

    await fs.rm(root, { force: true, recursive: true });
  });
});
