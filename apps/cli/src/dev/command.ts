import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
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

// --- Dev-server resolution ---

interface StandaloneServer {
  mode: "standalone";
  devServerDir: string;
  packagesDir: string;
}

interface MonorepoServer {
  mode: "monorepo";
  repoRoot: string;
}

type DevServerResolution = StandaloneServer | MonorepoServer;

/**
 * Derive the CLI npm package root from the running script path.
 * The CLI entry point is at `<pkg-root>/dist/cli.mjs`.
 */
const resolveCliPackageRoot = (cliFilePath: string): string =>
  path.dirname(path.dirname(cliFilePath));

/**
 * Check if a shipped dev-server exists alongside the CLI (npm-installed mode).
 * Verifies both the dev-server directory AND that `next` is resolvable
 * (it's a dependency when npm-installed, but not in the monorepo).
 */
const findStandaloneDevServer = async (
  cliPackageRoot: string
): Promise<StandaloneServer | null> => {
  const devServerDir = path.join(cliPackageRoot, "dev-server");
  if (!(await fileExists(path.join(devServerDir, "next.config.js")))) {
    return null;
  }

  // Verify `next` is resolvable — this distinguishes npm-installed from
  // a monorepo checkout that happens to have dev-server/ from prepare-dist.
  try {
    createRequire(path.join(cliPackageRoot, "package.json")).resolve(
      "next/package.json"
    );
  } catch {
    return null;
  }

  return {
    devServerDir,
    mode: "standalone",
    packagesDir: path.join(cliPackageRoot, "packages"),
  };
};

/**
 * Resolve the `next` CLI binary from the blodemd package's own dependencies.
 */
const resolveNextBin = (cliPackageRoot: string): string => {
  const require = createRequire(path.join(cliPackageRoot, "package.json"));
  const nextPkgPath = require.resolve("next/package.json");
  return path.join(path.dirname(nextPkgPath), "dist", "bin", "next");
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
    "Could not locate the blodemd dev server.",
    EXIT_CODES.ERROR,
    "Make sure blodemd is installed correctly (npm i blodemd)."
  );
};

const resolveDevServer = async (
  cliFilePath: string
): Promise<DevServerResolution> => {
  const cliPackageRoot = resolveCliPackageRoot(cliFilePath);

  // Try standalone mode first (npm-installed)
  const standalone = await findStandaloneDevServer(cliPackageRoot);
  if (standalone) {
    return standalone;
  }

  // Fall back to monorepo mode (development)
  const repoRoot = await findMonorepoRoot(path.dirname(cliFilePath));
  return { mode: "monorepo", repoRoot };
};

const spawnDevServer = (
  server: DevServerResolution,
  { root, port }: { root: string; port: number }
): ReturnType<typeof spawn> => {
  if (server.mode === "standalone") {
    // devServerDir is <pkg-root>/dev-server, so parent is the package root
    const cliPackageRoot = path.dirname(server.devServerDir);
    const nextBin = resolveNextBin(cliPackageRoot);

    return spawn(process.execPath, [nextBin, "dev"], {
      cwd: server.devServerDir,
      env: {
        ...process.env,
        BLODEMD_PACKAGES_DIR: server.packagesDir,
        DOCS_ROOT: root,
        // NODE_PATH lets require.resolve (used by Next.js transpilePackages)
        // find @repo/* packages from our shipped packages/ directory.
        NODE_PATH: [server.packagesDir, process.env.NODE_PATH]
          .filter(Boolean)
          .join(path.delimiter),
        PORT: String(port),
      },
      stdio: "inherit",
    });
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawn(npmCommand, ["run", "dev", "--workspace=dev-server"], {
    cwd: server.repoRoot,
    env: {
      ...process.env,
      DOCS_ROOT: root,
      PORT: String(port),
    },
    stdio: "inherit",
  });
};

// --- Server readiness ---

const waitForServer = async ({
  child,
  port,
}: {
  child: ReturnType<typeof spawn>;
  port: number;
}) => {
  const url = `http://localhost:${port}${DEV_READY_ENDPOINT}`;
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

// --- Main command ---

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
    const server = await resolveDevServer(cliFilePath);
    const localUrl = `http://localhost:${port}`;

    log.info(`Docs root: ${chalk.cyan(root)}`);

    const child = spawnDevServer(server, { port, root });

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
