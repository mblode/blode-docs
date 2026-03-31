import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveDocsRoot } from "./resolve-root.js";

const tempRoots: string[] = [];

const createTempDir = async (prefix: string): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (root) => {
      await fs.rm(root, { force: true, recursive: true });
    })
  );
});

describe("resolveDocsRoot", () => {
  it("resolves explicit directories relative to the provided cwd", async () => {
    const root = await createTempDir("blodemd-resolve-root-");

    await expect(resolveDocsRoot("docs", root)).resolves.toBe(
      path.join(root, "docs")
    );
  });

  it("finds nested docs roots in the monorepo layout", async () => {
    const root = await createTempDir("blodemd-resolve-root-");
    const docsRoot = path.join(root, "apps", "docs", "content", "docs");
    const exampleRoot = path.join(root, "apps", "docs", "content", "example");

    await fs.mkdir(docsRoot, { recursive: true });
    await fs.mkdir(exampleRoot, { recursive: true });
    await fs.writeFile(path.join(docsRoot, "docs.json"), "{}\n", "utf8");
    await fs.writeFile(path.join(exampleRoot, "docs.json"), "{}\n", "utf8");

    await expect(resolveDocsRoot(undefined, root)).resolves.toBe(docsRoot);
  });

  it("falls back to the provided cwd when no docs root is found", async () => {
    const root = await createTempDir("blodemd-resolve-root-");

    await expect(resolveDocsRoot(undefined, root)).resolves.toBe(root);
  });
});
