import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { intro, log } from "@clack/prompts";
import chalk from "chalk";
import open from "open";

import { CliError, EXIT_CODES, toCliError } from "../errors.js";
import { resolveDocsRoot, validateDocsRoot } from "./resolve-root.js";
import { createDevWatcher } from "./watcher.js";

const DEV_READY_ENDPOINT = "/blodemd-dev/version";
const DEV_READY_TIMEOUT_MS = 45_000;

const parsePositiveInteger = (value: string, label: string): number => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CliError(
      `${label} must be a positive integer.`,
      EXIT_CODES.VALIDATION
    );
  }

  return parsed;
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const findMonorepoRoot = async (start: string): Promise<string> => {
  let current = start;

  while (true) {
    const packageJsonPath = path.join(current, "package.json");
    if (await fileExists(packageJsonPath)) {
      const raw = await fs.readFile(packageJsonPath, "utf8");
      const parsed = JSON.parse(raw) as { workspaces?: string[] };
      const workspaces = parsed.workspaces ?? [];

      if (workspaces.includes("apps/*") && workspaces.includes("packages/*")) {
        return current;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw new CliError(
    "Could not locate the blodemd monorepo root.",
    EXIT_CODES.ERROR,
    "The monorepo-only dev server must be run from this repository checkout."
  );
};

const waitForServer = async ({
  child,
  port,
}: {
  child: ReturnType<typeof spawn>;
  port: number;
}) => {
  const url = `http://127.0.0.1:${port}${DEV_READY_ENDPOINT}`;
  const startedAt = Date.now();

  while (Date.now() - startedAt < DEV_READY_TIMEOUT_MS) {
    if (child.exitCode !== null) {
      throw new CliError(
        "The local dev server exited before it became ready.",
        EXIT_CODES.ERROR
      );
    }

    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await delay(500);
  }

  throw new CliError(
    "Timed out waiting for the local dev server to start.",
    EXIT_CODES.ERROR
  );
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

export const devCommand = async ({
  dir,
  openBrowser,
  port: portValue,
}: {
  dir?: string;
  openBrowser: boolean;
  port: string;
}) => {
  intro(chalk.bold("blodemd dev"));

  try {
    const port = parsePositiveInteger(portValue, "Port");
    const root = await resolveDocsRoot(dir);
    await validateDocsRoot(root);

    const cliFilePath = fileURLToPath(import.meta.url);
    const repoRoot = await findMonorepoRoot(path.dirname(cliFilePath));
    const localUrl = `http://127.0.0.1:${port}`;

    log.info(`Docs root: ${chalk.cyan(root)}`);

    const child = spawn(npmCommand, ["run", "dev", "--workspace=dev-server"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        DOCS_ROOT: root,
        PORT: String(port),
      },
      stdio: "inherit",
    });

    let watcher: Awaited<ReturnType<typeof createDevWatcher>> | null = null;
    let shuttingDown = false;

    const closeAll = async () => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;

      if (watcher) {
        await watcher.close();
        watcher = null;
      }

      if (child.exitCode === null && !child.killed) {
        child.kill("SIGTERM");
      }
    };

    const onSignal = async () => {
      await closeAll();
    };

    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);

    try {
      await waitForServer({ child, port });

      watcher = await createDevWatcher({ port, root });
      log.success(`Dev server running at ${chalk.cyan(localUrl)}`);

      if (openBrowser) {
        await open(localUrl);
      }

      const [code, signal] = (await once(child, "exit")) as [
        number | null,
        NodeJS.Signals | null,
      ];

      await closeAll();
      process.removeListener("SIGINT", onSignal);
      process.removeListener("SIGTERM", onSignal);

      if (shuttingDown || signal === "SIGINT" || signal === "SIGTERM") {
        return;
      }

      if (code !== 0) {
        throw new CliError(
          `The local dev server exited with code ${code ?? "unknown"}.`,
          EXIT_CODES.ERROR
        );
      }
    } catch (error) {
      await closeAll();
      process.removeListener("SIGINT", onSignal);
      process.removeListener("SIGTERM", onSignal);
      throw error;
    }
  } catch (error) {
    const cliError = toCliError(error);

    log.error(cliError.message);
    if (cliError.hint) {
      log.info(cliError.hint);
    }

    process.exitCode = cliError.exitCode;
  }
};
