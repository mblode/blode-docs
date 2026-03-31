import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CliError, EXIT_CODES } from "./errors.js";

const MIN_SUPPORTED_NODE_VERSION = [20, 17, 0] as const;

export const SUPPORTED_NODE_RANGE = ">=20.17.0";

const parseVersion = (input: string): [number, number, number] | null => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(input.trim());
  if (!match) {
    return null;
  }

  const [, majorText = "", minorText = "", patchText = ""] = match;
  if (!majorText || !minorText || !patchText) {
    return null;
  }

  const major = Number.parseInt(majorText, 10);
  const minor = Number.parseInt(minorText, 10);
  const patch = Number.parseInt(patchText, 10);

  if ([major, minor, patch].some((value) => Number.isNaN(value))) {
    return null;
  }

  return [major, minor, patch];
};

export const isSupportedNodeVersion = (version: string): boolean => {
  const parsed = parseVersion(version);
  if (!parsed) {
    return false;
  }

  const [major, minor, patch] = parsed;
  const [minMajor, minMinor, minPatch] = MIN_SUPPORTED_NODE_VERSION;

  if (major !== minMajor) {
    return major > minMajor;
  }

  if (minor !== minMinor) {
    return minor > minMinor;
  }

  return patch >= minPatch;
};

export const assertSupportedNodeVersion = (
  version = process.versions.node
): void => {
  if (isSupportedNodeVersion(version)) {
    return;
  }

  throw new CliError(
    `blodemd requires Node.js ${SUPPORTED_NODE_RANGE}. Current version: ${version}.`,
    EXIT_CODES.VALIDATION,
    "Install a supported Node.js version and try again."
  );
};

export const readCliVersion = (moduleUrl: string): string => {
  const moduleDir = path.dirname(fileURLToPath(moduleUrl));
  const packageJsonPath = path.resolve(moduleDir, "..", "package.json");
  const raw = readFileSync(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { version?: string };

  return parsed.version ?? "0.0.0";
};
