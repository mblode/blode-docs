import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { intro, log } from "@clack/prompts";
import chalk from "chalk";
import open from "open";

import { CONFIG_DIR } from "../constants.js";
import { CliError, EXIT_CODES, toCliError } from "../errors.js";
import { resolveDocsRoot, validateDocsRoot } from "./resolve-root.js";
import { createDevWatcher } from "./watcher.js";

const DEV_READY_ENDPOINT = "/blodemd-dev/version";
const DEV_READY_TIMEOUT_MS = 45_000;
const DEV_PORT_SCAN_LIMIT = 10;
const DEV_SHUTDOWN_TIMEOUT_MS = 5000;
const LOCALHOST = "127.0.0.1";
const RUNTIME_EXCLUDE_DIRS = new Set([".next", ".turbo", "node_modules"]);

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

type PortAvailabilityProbe = (port: number) => Promise<boolean>;

const probePortAvailability: PortAvailabilityProbe = async (port) => {
  const server = createServer();

  const listening = (async () => {
    await once(server, "listening");
    return { kind: "listening" as const };
  })();
  const errored = (async () => {
    const [error] = await once(server, "error");
    return {
      error: error as NodeJS.ErrnoException,
      kind: "error" as const,
    };
  })();

  server.listen({ exclusive: true, host: LOCALHOST, port });

  const outcome = await Promise.race([listening, errored]);

  if (outcome.kind === "error") {
    if (
      outcome.error.code === "EADDRINUSE" ||
      outcome.error.code === "EACCES"
    ) {
      return false;
    }

    throw outcome.error;
  }

  server.close();
  await once(server, "close");
  return true;
};

export const resolveDevPort = async (
  requestedPort: number,
  probePort: PortAvailabilityProbe = probePortAvailability
): Promise<number> => {
  for (let offset = 0; offset < DEV_PORT_SCAN_LIMIT; offset += 1) {
    const candidate = requestedPort + offset;
    if (candidate > 65_535) {
      break;
    }

    if (await probePort(candidate)) {
      return candidate;
    }
  }

  throw new CliError(
    `No available port found within ${DEV_PORT_SCAN_LIMIT} attempts starting at ${requestedPort}.`,
    EXIT_CODES.ERROR,
    "Close the process using the port or pass a different --port value."
  );
};

export const shutdownChildProcess = async (
  child: ReturnType<typeof spawn>,
  timeoutMs: number = DEV_SHUTDOWN_TIMEOUT_MS
): Promise<void> => {
  if (child.exitCode !== null) {
    return;
  }

  const timer = setTimeout(() => {
    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }
  }, timeoutMs);

  const exitPromise = once(child, "exit");

  try {
    child.kill("SIGTERM");
  } catch (error) {
    clearTimeout(timer);

    const killError = error as NodeJS.ErrnoException;
    if (killError.code === "ESRCH") {
      return;
    }

    throw error;
  }

  await exitPromise.finally(() => {
    clearTimeout(timer);
  });
};

// --- Dev-server resolution ---

interface StandaloneServer {
  mode: "standalone";
  devServerDir: string;
  nextPackageRoot: string;
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

const copyStandaloneTree = async (
  sourceDir: string,
  targetDir: string
): Promise<void> => {
  await fs.cp(sourceDir, targetDir, {
    filter: (source) => {
      const relative = path.relative(sourceDir, source);
      if (!relative) {
        return true;
      }

      const topSegment = relative.split(path.sep)[0] ?? "";
      return !RUNTIME_EXCLUDE_DIRS.has(topSegment);
    },
    recursive: true,
  });
};

const isStandaloneCliInstall = async (
  cliPackageRoot: string
): Promise<boolean> => {
  try {
    const realRoot = await fs.realpath(cliPackageRoot);
    return realRoot.split(path.sep).includes("node_modules");
  } catch {
    return cliPackageRoot.split(path.sep).includes("node_modules");
  }
};

const materializeStandaloneRuntime = async (
  cliPackageRoot: string
): Promise<{ devServerDir: string; packagesDir: string }> => {
  const runtimeRoot = path.join(CONFIG_DIR, "standalone-runtime");
  await fs.rm(runtimeRoot, { force: true, recursive: true });
  await fs.mkdir(runtimeRoot, { recursive: true });

  for (const dir of ["dev-server", "docs", "packages"]) {
    await copyStandaloneTree(
      path.join(cliPackageRoot, dir),
      path.join(runtimeRoot, dir)
    );
  }

  await fs.symlink(
    path.join(cliPackageRoot, "node_modules"),
    path.join(runtimeRoot, "node_modules"),
    process.platform === "win32" ? "junction" : "dir"
  );

  await fs.writeFile(
    path.join(runtimeRoot, "dev-server", "package.json"),
    `${JSON.stringify(
      {
        dependencies: {
          next: "16.2.1",
          react: "^19.2.0",
          "react-dom": "^19.2.0",
        },
        devDependencies: {
          "@types/node": "^22.19.15",
          "@types/react": "19.2.14",
          "@types/react-dom": "19.2.3",
          typescript: "6.0.2",
        },
        name: "blodemd-dev-server",
        private: true,
        type: "module",
      },
      null,
      2
    )}\n`
  );

  return {
    devServerDir: path.join(runtimeRoot, "dev-server"),
    packagesDir: path.join(runtimeRoot, "packages"),
  };
};

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

  if (!(await isStandaloneCliInstall(cliPackageRoot))) {
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

  const runtime = await materializeStandaloneRuntime(cliPackageRoot);

  return {
    devServerDir: runtime.devServerDir,
    mode: "standalone",
    nextPackageRoot: cliPackageRoot,
    packagesDir: runtime.packagesDir,
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
    const nextBin = resolveNextBin(server.nextPackageRoot);

    return spawn(process.execPath, [nextBin, "dev", "--webpack"], {
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
    const resolvedPort = await resolveDevPort(port);
    const root = await resolveDocsRoot(dir);
    await validateDocsRoot(root);

    const cliFilePath = fileURLToPath(import.meta.url);
    const server = await resolveDevServer(cliFilePath);
    const localUrl = `http://localhost:${resolvedPort}`;

    log.info(`Docs root: ${chalk.cyan(root)}`);

    const child = spawnDevServer(server, { port: resolvedPort, root });

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

      await shutdownChildProcess(child);
    };

    process.once("SIGINT", closeAll);
    process.once("SIGTERM", closeAll);

    try {
      await waitForServer({ child, port: resolvedPort });

      watcher = await createDevWatcher({ port: resolvedPort, root });
      log.success(`Dev server running at ${chalk.cyan(localUrl)}`);

      if (openBrowser) {
        await open(localUrl);
      }

      const [code, signal] = (await once(child, "exit")) as [
        number | null,
        NodeJS.Signals | null,
      ];

      if (shuttingDown || signal === "SIGINT" || signal === "SIGTERM") {
        return;
      }

      if (code !== 0) {
        throw new CliError(
          `The local dev server exited with code ${code ?? "unknown"}.`,
          EXIT_CODES.ERROR
        );
      }
    } finally {
      await closeAll();
      process.removeListener("SIGINT", closeAll);
      process.removeListener("SIGTERM", closeAll);
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
