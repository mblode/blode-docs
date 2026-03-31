import fs from "node:fs/promises";
import path from "node:path";

import { normalizePath, shouldIgnoreRootDocsFile } from "@repo/common";

import type { ContentSource } from "./content-source.js";

const IGNORED_DIRECTORIES = new Set(["app", "lib", "node_modules", "public"]);

const isNotFoundError = (error: unknown) =>
  Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );

const isWithinRoot = (root: string, candidate: string) =>
  candidate === root || candidate.startsWith(`${root}${path.sep}`);

const resolveWithinRoot = (root: string, relativePath: string) => {
  const normalized = normalizePath(relativePath);
  const absolutePath = path.resolve(root, normalized);

  if (!isWithinRoot(root, absolutePath)) {
    throw new Error(`Path "${relativePath}" escapes the content source root.`);
  }

  return absolutePath;
};

const walkFiles = async (
  directory: string,
  prefix: string
): Promise<string[]> => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    const relativePath = prefix ? path.join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      files.push(...(await walkFiles(absolutePath, relativePath)));
      continue;
    }

    if (entry.isFile()) {
      if (!prefix && shouldIgnoreRootDocsFile(entry.name)) {
        continue;
      }
      files.push(normalizePath(relativePath));
    }
  }

  return files;
};

export class FsContentSource implements ContentSource {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  async readFile(relativePath: string): Promise<string> {
    return await fs.readFile(
      resolveWithinRoot(this.root, relativePath),
      "utf8"
    );
  }

  async listFiles(directory: string): Promise<string[]> {
    return await walkFiles(resolveWithinRoot(this.root, directory), "");
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(resolveWithinRoot(this.root, relativePath));
      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  // oxlint-disable-next-line eslint/class-methods-use-this
  resolveUrl(): string | null {
    return null;
  }
}

export const createFsSource = (root: string): ContentSource =>
  new FsContentSource(root);
