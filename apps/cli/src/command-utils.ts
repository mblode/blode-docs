import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { log } from "@clack/prompts";
import { shouldIgnoreRootDocsFile } from "@repo/common";
import { InvalidArgumentError } from "commander";

import { toCliError } from "./errors.js";
import { isInteractive } from "./output.js";
import { validateProjectSlug } from "./project-config.js";
import { isScaffoldTemplate, SCAFFOLD_TEMPLATES } from "./scaffold.js";
import type { ScaffoldTemplate } from "./scaffold.js";

export const readGitValue = (gitArgs: string[]): string | undefined => {
  const result = spawnSync("git", gitArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (result.status !== 0) {
    return;
  }

  const value = result.stdout.trim();
  return value || undefined;
};

const shouldSkipEntry = (name: string): boolean =>
  name.startsWith(".") || name === "node_modules";

export const collectFiles = async (
  root: string,
  directory = root
): Promise<string[]> => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (shouldSkipEntry(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    const relativePath = path
      .relative(root, absolutePath)
      .split(path.sep)
      .join("/");
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(root, absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      if (shouldIgnoreRootDocsFile(relativePath)) {
        continue;
      }
      files.push(absolutePath);
    }
  }

  return files.toSorted((left, right) => left.localeCompare(right));
};

export const reportCommandError = (
  prefix: string,
  error: unknown,
  options?: { json?: boolean }
): void => {
  const cliError = toCliError(error);

  // Under --json the failure is data too: a caller parsing stdout gets an
  // envelope with a stable `code` instead of an empty stream and an exit code.
  if (options?.json) {
    process.stdout.write(
      `${JSON.stringify({
        code: cliError.code,
        error: true,
        hint: cliError.hint,
        message: cliError.message,
        ...(cliError.status === null ? {} : { status: cliError.status }),
      })}\n`
    );
    process.stderr.write(`${prefix}: ${cliError.message}\n`);
    process.exitCode = cliError.exitCode;
    return;
  }

  if (isInteractive(options?.json)) {
    log.error(`${prefix}: ${cliError.message}`);
    if (cliError.hint) {
      log.info(cliError.hint);
    }
    log.info("Failed");
  } else {
    process.stderr.write(`${prefix}: ${cliError.message}\n`);
    if (cliError.hint) {
      process.stderr.write(`${cliError.hint}\n`);
    }
  }

  process.exitCode = cliError.exitCode;
};

export const parseScaffoldTemplate = (value: string): ScaffoldTemplate => {
  if (isScaffoldTemplate(value)) {
    return value;
  }

  throw new InvalidArgumentError(
    `Expected one of: ${SCAFFOLD_TEMPLATES.join(", ")}.`
  );
};

export const parseProjectSlug = (value: string): string => {
  const validationError = validateProjectSlug(value);

  if (validationError) {
    throw new InvalidArgumentError(validationError);
  }

  return value.trim();
};
