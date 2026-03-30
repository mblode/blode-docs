import fs from "node:fs/promises";
import path from "node:path";

import { createFsSource, loadSiteConfig } from "@repo/previewing";

import { CliError, EXIT_CODES } from "../errors.js";

const CONFIG_FILE = "docs.json";

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const resolveDocsRoot = async (dir?: string): Promise<string> => {
  if (dir) {
    return path.resolve(process.cwd(), dir);
  }

  const candidates = [
    process.cwd(),
    path.join(process.cwd(), "docs"),
    path.join(process.cwd(), "apps/docs"),
  ];

  for (const candidate of candidates) {
    if (await fileExists(path.join(candidate, CONFIG_FILE))) {
      return candidate;
    }
  }

  return process.cwd();
};

export const validateDocsRoot = async (root: string) => {
  const result = await loadSiteConfig(createFsSource(root));

  if (!result.ok) {
    throw new CliError(
      result.errors.join("\n"),
      EXIT_CODES.VALIDATION,
      `Make sure ${CONFIG_FILE} exists and is valid JSON.`
    );
  }

  return result;
};
