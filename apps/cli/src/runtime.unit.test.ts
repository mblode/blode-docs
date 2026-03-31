import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { CliError } from "./errors.js";
import {
  assertSupportedNodeVersion,
  isSupportedNodeVersion,
  readCliVersion,
} from "./runtime.js";

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

describe("isSupportedNodeVersion", () => {
  it("accepts supported versions in the configured range", () => {
    expect(isSupportedNodeVersion("20.17.0")).toBe(true);
    expect(isSupportedNodeVersion("22.19.1")).toBe(true);
    expect(isSupportedNodeVersion("24.4.0")).toBe(true);
  });

  it("rejects versions outside the configured range", () => {
    expect(isSupportedNodeVersion("20.16.9")).toBe(false);
    expect(isSupportedNodeVersion("not-a-version")).toBe(false);
  });
});

describe("assertSupportedNodeVersion", () => {
  it("throws a CLI error with guidance for unsupported versions", () => {
    expect(() => assertSupportedNodeVersion("20.16.9")).toThrowError(CliError);
  });
});

describe("readCliVersion", () => {
  it("reads the package version relative to the current module", async () => {
    const root = await createTempDir("blodemd-runtime-");
    const distDir = path.join(root, "dist");

    await fs.mkdir(distDir, { recursive: true });
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ version: "1.2.3" }),
      "utf8"
    );
    await fs.writeFile(path.join(distDir, "cli.mjs"), "", "utf8");

    const moduleUrl = pathToFileURL(path.join(distDir, "cli.mjs")).toString();
    expect(readCliVersion(moduleUrl)).toBe("1.2.3");
  });
});
