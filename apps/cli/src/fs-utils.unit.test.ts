import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  findExistingPaths,
  writeFileIfMissing,
  writeSymlinkIfMissing,
} from "./fs-utils.js";

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

describe("writeFileIfMissing", () => {
  it("creates a file when it does not exist", async () => {
    const root = await createTempDir("blodemd-fs-utils-");
    const filePath = path.join(root, "docs.json");

    await writeFileIfMissing(filePath, '{"name":"docs"}\n');

    await expect(fs.readFile(filePath, "utf8")).resolves.toBe(
      '{"name":"docs"}\n'
    );
  });

  it("leaves existing files untouched", async () => {
    const root = await createTempDir("blodemd-fs-utils-");
    const filePath = path.join(root, "docs.json");

    await fs.writeFile(filePath, '{"name":"existing"}\n', "utf8");
    await writeFileIfMissing(filePath, '{"name":"new"}\n');

    await expect(fs.readFile(filePath, "utf8")).resolves.toBe(
      '{"name":"existing"}\n'
    );
  });

  it("rethrows write failures that are not EEXIST", async () => {
    const root = await createTempDir("blodemd-fs-utils-");
    const filePath = path.join(root, "missing", "docs.json");

    await expect(
      writeFileIfMissing(filePath, '{"name":"docs"}\n')
    ).rejects.toBeInstanceOf(Error);
  });

  it("rethrows when the target path is an existing directory", async () => {
    const root = await createTempDir("blodemd-fs-utils-");
    const filePath = path.join(root, "docs.json");

    await fs.mkdir(filePath, { recursive: true });

    await expect(
      writeFileIfMissing(filePath, '{"name":"docs"}\n')
    ).rejects.toBeInstanceOf(Error);
  });
});

describe("writeSymlinkIfMissing", () => {
  it("creates a symlink when it does not exist", async () => {
    const root = await createTempDir("blodemd-fs-utils-");
    const filePath = path.join(root, "AGENTS.md");

    await writeSymlinkIfMissing(filePath, "CLAUDE.md");

    const link = await fs.readlink(filePath);
    const stats = await fs.lstat(filePath);

    expect(link).toBe("CLAUDE.md");
    expect(stats.isSymbolicLink()).toBe(true);
  });

  it("leaves existing files untouched", async () => {
    const root = await createTempDir("blodemd-fs-utils-");
    const filePath = path.join(root, "AGENTS.md");

    await fs.writeFile(filePath, "# Existing\n", "utf8");
    await writeSymlinkIfMissing(filePath, "CLAUDE.md", {
      fallbackContent: "# New\n",
    });

    await expect(fs.readFile(filePath, "utf8")).resolves.toBe("# Existing\n");
  });

  it("falls back to a regular file when symlinks are unavailable", async () => {
    const root = await createTempDir("blodemd-fs-utils-");
    const filePath = path.join(root, "AGENTS.md");

    await writeSymlinkIfMissing(filePath, "CLAUDE.md", {
      fallbackContent: "# Instructions\n",
      symlink: () => {
        const error = new Error("symlinks disabled") as NodeJS.ErrnoException;
        error.code = "EPERM";
        return Promise.reject(error);
      },
    });

    await expect(fs.readFile(filePath, "utf8")).resolves.toBe(
      "# Instructions\n"
    );
  });
});

describe("findExistingPaths", () => {
  it("returns matching files in sorted order", async () => {
    const root = await createTempDir("blodemd-fs-utils-");

    await fs.writeFile(path.join(root, "docs.json"), "{}\n", "utf8");
    await fs.mkdir(path.join(root, "logo"), { recursive: true });
    await fs.writeFile(path.join(root, "logo", "light.svg"), "<svg />\n");

    await expect(
      findExistingPaths(root, ["logo/light.svg", "index.mdx", "docs.json"])
    ).resolves.toEqual(["docs.json", "logo/light.svg"]);
  });

  it("treats existing symlinks as conflicts", async () => {
    const root = await createTempDir("blodemd-fs-utils-");

    await fs.writeFile(path.join(root, "CLAUDE.md"), "# Notes\n", "utf8");
    await fs.symlink("CLAUDE.md", path.join(root, "AGENTS.md"));

    await expect(findExistingPaths(root, ["AGENTS.md"])).resolves.toEqual([
      "AGENTS.md",
    ]);
  });
});
