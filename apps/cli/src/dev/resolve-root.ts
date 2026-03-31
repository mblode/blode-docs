import fs from "node:fs/promises";
import path from "node:path";

import { loadValidatedSiteConfig } from "../site-config.js";

const CONFIG_FILE = "docs.json";
const ROOT_CANDIDATES = ["", "docs", path.join("apps", "docs")];
const NESTED_DOCS_ROOT_CONTAINERS = [
  path.join("content"),
  path.join("apps", "docs", "content"),
];

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const resolveDocsRoot = async (
  dir?: string,
  cwd: string = process.cwd()
): Promise<string> => {
  const currentWorkingDir = path.resolve(cwd);

  if (dir) {
    return path.resolve(currentWorkingDir, dir);
  }

  const candidates = ROOT_CANDIDATES.map((candidate) =>
    path.join(currentWorkingDir, candidate)
  );

  for (const candidate of candidates) {
    if (await fileExists(path.join(candidate, CONFIG_FILE))) {
      return candidate;
    }
  }

  for (const container of NESTED_DOCS_ROOT_CONTAINERS) {
    const containerPath = path.join(currentWorkingDir, container);
    if (!(await fileExists(containerPath))) {
      continue;
    }

    const entries = await fs.readdir(containerPath, { withFileTypes: true });
    const docsRoots = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(containerPath, entry.name))
      .toSorted((left, right) => {
        const preferredNames = ["docs", "example"];
        const leftRank = preferredNames.indexOf(path.basename(left));
        const rightRank = preferredNames.indexOf(path.basename(right));

        if (leftRank !== rightRank) {
          if (leftRank === -1) {
            return 1;
          }

          if (rightRank === -1) {
            return -1;
          }

          return leftRank - rightRank;
        }

        return left.localeCompare(right);
      });

    for (const candidate of docsRoots) {
      if (await fileExists(path.join(candidate, CONFIG_FILE))) {
        return candidate;
      }
    }
  }

  return currentWorkingDir;
};

export const validateDocsRoot = loadValidatedSiteConfig;
