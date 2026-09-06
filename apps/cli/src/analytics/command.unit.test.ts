import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerAnalyticsCommand } from "./command.js";

vi.mock("../auth-session.js", () => ({
  resolveAuthToken: vi.fn(() => Promise.resolve({ token: "test-token" })),
}));

const API_URL = "https://api.test";

const PROJECT = {
  analytics: { posthog: { projectKey: "phc_abcdefghijklmnopqrstuvwxyz" } },
  id: "project-1",
  name: "Diffhub",
  slug: "diffhub",
};

let fetchMock: ReturnType<typeof vi.fn>;
let stdout: string[];
let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

const originalTTY = process.stdout.isTTY;
const originalEnvProject = process.env.BLODEMD_PROJECT;

const jsonResponse = (body: unknown, status = 200): Response =>
  Response.json(body, { status });

const run = async (argv: string[]): Promise<void> => {
  const program = new Command();
  program.exitOverride();
  program.configureOutput({
    writeErr: () => {},
    writeOut: () => {},
  });
  registerAnalyticsCommand(program);
  await program.parseAsync(argv, { from: "user" });
};

const stdoutLines = (): string[] => stdout.join("").split("\n").filter(Boolean);

beforeEach(() => {
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: false,
  });
  delete process.env.BLODEMD_PROJECT;
  stdout = [];
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  stdoutSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      stdout.push(String(chunk));
      return true;
    });
  stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  process.exitCode = undefined;
});

afterEach(() => {
  stdoutSpy.mockRestore();
  stderrSpy.mockRestore();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value: originalTTY,
  });
  if (originalEnvProject === undefined) {
    delete process.env.BLODEMD_PROJECT;
  } else {
    process.env.BLODEMD_PROJECT = originalEnvProject;
  }
  process.exitCode = undefined;
});

describe("analytics get --json", () => {
  it("emits exactly one JSON line on stdout", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROJECT));

    await run([
      "analytics",
      "get",
      "--project",
      "diffhub",
      "--api-url",
      API_URL,
      "--json",
    ]);

    const lines = stdoutLines();
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] as string)).toEqual({
      analytics: {
        posthog: { projectKey: PROJECT.analytics.posthog.projectKey },
      },
      project: "diffhub",
    });
    expect(process.exitCode).toBeUndefined();
  });

  it("encodes the slug into the request path", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(PROJECT));

    await run([
      "analytics",
      "get",
      "--project",
      "diffhub",
      "--api-url",
      API_URL,
      "--json",
    ]);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.test/projects/by-slug/diffhub"
    );
  });

  it("writes a JSON error envelope on stdout when the project is missing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "not found" }, 404));

    await run([
      "analytics",
      "get",
      "--project",
      "missing",
      "--api-url",
      API_URL,
      "--json",
    ]);

    const lines = stdoutLines();
    expect(lines).toHaveLength(1);
    const envelope = JSON.parse(lines[0] as string) as Record<string, unknown>;
    expect(envelope.error).toBe(true);
    expect(envelope.code).toBe("NOT_FOUND");
    expect(envelope.status).toBe(404);
    expect(envelope.message).toContain('Project "missing" not found');
    expect(process.exitCode).toBe(1);
  });
});

describe("analytics slug hardening", () => {
  it.each([
    ["../../etc/passwd"],
    ["%2e%2e%2fadmin"],
    ["..%2Fadmin"],
    ["diffhub/../other"],
  ])("rejects --project %s without issuing a request", async (slug) => {
    await expect(
      run([
        "analytics",
        "get",
        "--project",
        slug,
        "--api-url",
        API_URL,
        "--json",
      ])
    ).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a traversal slug from BLODEMD_PROJECT without issuing a request", async () => {
    process.env.BLODEMD_PROJECT = "../../etc/passwd";

    await run(["analytics", "get", "--api-url", API_URL, "--json"]);

    expect(fetchMock).not.toHaveBeenCalled();
    const lines = stdoutLines();
    expect(lines).toHaveLength(1);
    const envelope = JSON.parse(lines[0] as string) as Record<string, unknown>;
    expect(envelope.error).toBe(true);
    expect(envelope.code).toBe("CONFIG_INVALID");
    expect(envelope.message).toContain("BLODEMD_PROJECT");
    expect(process.exitCode).toBe(3);
  });

  it("rejects a URL-encoded traversal from BLODEMD_PROJECT", async () => {
    process.env.BLODEMD_PROJECT = "%2e%2e%2fadmin";

    await run(["analytics", "get", "--api-url", API_URL, "--json"]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(3);
  });
});

describe("analytics set posthog --json", () => {
  it("emits the resulting analytics config as one line", async () => {
    const key = "phc_zyxwvutsrqponmlkjihgfedcba";
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ...PROJECT, analytics: null }))
      .mockResolvedValueOnce(
        jsonResponse({
          ...PROJECT,
          analytics: {
            posthog: { host: "https://eu.i.posthog.com", projectKey: key },
          },
        })
      );

    await run([
      "analytics",
      "set",
      "posthog",
      key,
      "--host",
      "https://eu.i.posthog.com",
      "--project",
      "diffhub",
      "--api-url",
      API_URL,
      "--json",
    ]);

    const lines = stdoutLines();
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] as string)).toEqual({
      analytics: {
        posthog: { host: "https://eu.i.posthog.com", projectKey: key },
      },
      project: "diffhub",
    });

    const [, patchCall] = fetchMock.mock.calls;
    const patchInit = patchCall?.[1] as RequestInit | undefined;
    expect(patchCall?.[0]).toBe("https://api.test/projects/project-1");
    expect(patchInit?.method).toBe("PATCH");
  });
});

describe("analytics unset --json", () => {
  it("emits the cleared analytics config as one line", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(PROJECT))
      .mockResolvedValueOnce(jsonResponse({ ...PROJECT, analytics: null }));

    await run([
      "analytics",
      "unset",
      "posthog",
      "--project",
      "diffhub",
      "--api-url",
      API_URL,
      "--json",
    ]);

    const lines = stdoutLines();
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] as string)).toEqual({
      analytics: null,
      project: "diffhub",
    });
    const [, patchCall] = fetchMock.mock.calls;
    const patchInit = patchCall?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(patchInit?.body))).toEqual({ analytics: null });
  });
});
