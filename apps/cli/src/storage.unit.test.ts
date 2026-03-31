import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const tempRoots: string[] = [];

const createConfigRoot = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "blodemd-storage-"));
  tempRoots.push(root);
  await fs.mkdir(path.join(root, "blodemd"), { recursive: true });
  return root;
};

const loadStorageModule = async (configRoot: string) => {
  vi.resetModules();
  vi.stubEnv("XDG_CONFIG_HOME", configRoot);
  return await import("./storage.js");
};

afterEach(async () => {
  vi.unstubAllEnvs();

  await Promise.all(
    tempRoots.splice(0).map(async (root) => {
      await fs.rm(root, { force: true, recursive: true });
    })
  );
});

describe("readAuthFile", () => {
  it("throws when credentials.json contains invalid JSON", async () => {
    const configRoot = await createConfigRoot();
    const credentialsPath = path.join(
      configRoot,
      "blodemd",
      "credentials.json"
    );

    await fs.writeFile(credentialsPath, "{bad json", "utf8");

    const { readAuthFile } = await loadStorageModule(configRoot);

    await expect(readAuthFile()).rejects.toMatchObject(
      expect.objectContaining({
        message: expect.stringMatching(/Invalid credentials JSON/),
        name: "CliError",
      })
    );
  });

  it("throws when a stored session is malformed", async () => {
    const configRoot = await createConfigRoot();
    const credentialsPath = path.join(
      configRoot,
      "blodemd",
      "credentials.json"
    );

    await fs.writeFile(
      credentialsPath,
      JSON.stringify({
        session: {
          accessToken: "token",
          createdAt: 123,
        },
        version: 1,
      }),
      "utf8"
    );

    const { readAuthFile } = await loadStorageModule(configRoot);

    await expect(readAuthFile()).rejects.toMatchObject(
      expect.objectContaining({
        message: expect.stringMatching(/Invalid credentials format/),
        name: "CliError",
      })
    );
  });
});
