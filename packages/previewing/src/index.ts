import fs from "node:fs/promises";
import path from "node:path";
import { normalizePath } from "@repo/common";
import type { DocsConfig } from "@repo/models";
import { validateDocsConfig } from "@repo/validation";

export type DocsConfigResult =
  | { ok: true; config: DocsConfig }
  | { ok: false; errors: string[] };

export const loadDocsConfig = async (
  projectRoot: string
): Promise<DocsConfigResult> => {
  const configPath = path.join(projectRoot, "docs.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const result = validateDocsConfig(parsed);
    if (!result.success) {
      return { ok: false, errors: result.errors };
    }
    return { ok: true, config: result.data };
  } catch (error) {
    return {
      ok: false,
      errors: [
        error instanceof Error ? error.message : "Failed to load docs.json",
      ],
    };
  }
};

const DOC_FILE_EXTENSION_REGEX = /(\.mdx|\.md)$/;

const candidatePaths = (slug: string) => {
  const clean = normalizePath(slug || "");
  const base = clean.length ? clean : "index";
  return [`${base}.mdx`, `${base}.md`, path.join(base, "index.mdx")] as const;
};

export const resolveDocPath = async (projectRoot: string, slug: string) => {
  const candidates = candidatePaths(slug);
  for (const candidate of candidates) {
    const absolutePath = path.join(projectRoot, candidate);
    try {
      await fs.access(absolutePath);
      return { exists: true, absolutePath, relativePath: candidate };
    } catch {
      // File doesn't exist, continue to next candidate
    }
  }
  return { exists: false, absolutePath: "", relativePath: "" };
};

export const loadDocSource = async (absolutePath: string) => {
  return await fs.readFile(absolutePath, "utf-8");
};

export const listDocFiles = async (projectRoot: string) => {
  const entries: string[] = [];

  const walk = async (dir: string, prefix: string) => {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith(".")) {
        continue;
      }
      const absolute = path.join(dir, item.name);
      const relative = prefix ? path.join(prefix, item.name) : item.name;
      if (item.isDirectory()) {
        await walk(absolute, relative);
      } else if (item.isFile() && DOC_FILE_EXTENSION_REGEX.test(item.name)) {
        entries.push(relative);
      }
    }
  };

  await walk(projectRoot, "");
  return entries;
};
