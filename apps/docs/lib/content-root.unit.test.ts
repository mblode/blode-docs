import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { getTenantDocsPath } from "./content-root";

const originalCwd = process.cwd();
const tempDirs: string[] = [];

const createTempDir = async (prefix: string) => {
  const directory = await fsPromises.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(directory);
  return directory;
};

const writeDocsConfig = async (filePath: string) => {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
  await fsPromises.writeFile(
    filePath,
    JSON.stringify({ name: "Example" }),
    "utf8"
  );
};

afterEach(async () => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.splice(0).map(async (directory) => {
      await fsPromises.rm(directory, { force: true, recursive: true });
    })
  );
});

describe("getTenantDocsPath", () => {
  it("uses the package-local content directory when running from apps/docs", async () => {
    const root = await createTempDir("docs-app-root-");
    await writeDocsConfig(path.join(root, "content/example/docs.json"));
    process.chdir(root);

    expect(getTenantDocsPath("example")).toBe(
      path.join(process.cwd(), "content/example")
    );
  });

  it("uses the monorepo app content directory when running from the repo root", async () => {
    const root = await createTempDir("docs-monorepo-root-");
    await writeDocsConfig(
      path.join(root, "apps/docs/content/example/docs.json")
    );
    process.chdir(root);

    expect(getTenantDocsPath("example")).toBe(
      path.join(process.cwd(), "apps/docs/content/example")
    );
  });

  it("falls back to the repo-local docs path when no candidate contains docs.json", async () => {
    const root = await createTempDir("docs-fallback-root-");
    process.chdir(root);
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    expect(getTenantDocsPath("donebear")).toBe(
      path.join(process.cwd(), "apps/docs/content/donebear")
    );
  });
});
