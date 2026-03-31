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
import { parsePort } from "../validation.js";
import { resolveDocsRoot, validateDocsRoot } from "./resolve-root.js";
import { createDevWatcher } from "./watcher.js";

const DEV_READY_ENDPOINT = "/blodemd-dev/version";
const DEV_READY_TIMEOUT_MS = 45_000;
const DEV_PORT_SCAN_LIMIT = 10;
const DEV_SHUTDOWN_TIMEOUT_MS = 5000;
const LOCALHOST = "127.0.0.1";
const RUNTIME_EXCLUDE_DIRS = new Set([".next", ".turbo", "node_modules"]);
const STANDALONE_RUNTIME_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const STANDALONE_RUNTIME_PREFIX = "standalone-runtime-";
const TURBOPACK_ARGS = ["dev", "--turbopack"] as const;

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const resolveCommonAncestor = (pathsToCompare: string[]): string => {
  const [firstPath, ...restPaths] = pathsToCompare;
  if (!firstPath) {
    return path.sep;
  }

  const first = path.resolve(firstPath);
  const { root } = path.parse(first);
  const firstSegments = first
    .slice(root.length)
    .split(path.sep)
    .filter(Boolean);
  const sharedSegments: string[] = [];

  for (const [index, segment] of firstSegments.entries()) {
    const isShared = restPaths.every((candidatePath) => {
      const candidate = path.resolve(candidatePath);
      if (path.parse(candidate).root !== root) {
        return false;
      }

      const candidateSegments = candidate
        .slice(root.length)
        .split(path.sep)
        .filter(Boolean);
      return candidateSegments[index] === segment;
    });

    if (!isShared) {
      break;
    }

    sharedSegments.push(segment);
  }

  return path.join(root, ...sharedSegments);
};

const cleanupStandaloneRuntimeRoots = async (
  configDir: string,
  maxAgeMs: number = STANDALONE_RUNTIME_MAX_AGE_MS
): Promise<void> => {
  const cutoff = Date.now() - maxAgeMs;
  const entries = await fs.readdir(configDir, { withFileTypes: true });

  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          entry.name.startsWith(STANDALONE_RUNTIME_PREFIX)
      )
      .map(async (entry) => {
        const entryPath = path.join(configDir, entry.name);
        const stats = await fs.stat(entryPath);

        if (stats.mtimeMs >= cutoff) {
          return;
        }

        await fs.rm(entryPath, { force: true, recursive: true });
      })
  );
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
  runtimeRoot: string;
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

export const createStandaloneRuntimeRoot = async (
  configDir: string = CONFIG_DIR
): Promise<string> => {
  await fs.mkdir(configDir, { recursive: true });
  await cleanupStandaloneRuntimeRoots(configDir);
  return await fs.mkdtemp(path.join(configDir, STANDALONE_RUNTIME_PREFIX));
};

const materializeStandaloneRuntime = async (
  cliPackageRoot: string
): Promise<{
  devServerDir: string;
  runtimeRoot: string;
}> => {
  const runtimeRoot = await createStandaloneRuntimeRoot();

  try {
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
    await fs.mkdir(path.join(runtimeRoot, "dev-server", "node_modules"), {
      recursive: true,
    });
    await fs.symlink(
      path.join(runtimeRoot, "packages", "@repo"),
      path.join(runtimeRoot, "dev-server", "node_modules", "@repo"),
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
      runtimeRoot,
    };
  } catch (error) {
    await fs.rm(runtimeRoot, { force: true, recursive: true });
    throw error;
  }
};

/**
 * Check if a shipped dev-server exists alongside an installed CLI package.
 * We only use standalone mode when the package root lives under `node_modules`.
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
    runtimeRoot: runtime.runtimeRoot,
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

interface DevServerLaunch {
  args: string[];
  command: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export const buildDevServerLaunch = (
  server: DevServerResolution,
  { root, port }: { root: string; port: number }
): DevServerLaunch => {
  if (server.mode === "standalone") {
    const nextBin = resolveNextBin(server.nextPackageRoot);

    return {
      args: [nextBin, ...TURBOPACK_ARGS],
      command: process.execPath,
      cwd: server.devServerDir,
      env: {
        ...process.env,
        BLODEMD_PACKAGES_DIR: path.join(server.runtimeRoot, "packages"),
        BLODEMD_TURBOPACK_ROOT: resolveCommonAncestor([
          server.nextPackageRoot,
          server.runtimeRoot,
        ]),
        DOCS_ROOT: root,
        PORT: String(port),
      },
    };
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  return {
    args: ["run", "dev", "--workspace=dev-server"],
    command: npmCommand,
    cwd: server.repoRoot,
    env: {
      ...process.env,
      DOCS_ROOT: root,
      PORT: String(port),
    },
  };
};

const spawnDevServer = (
  server: DevServerResolution,
  options: { root: string; port: number }
): ReturnType<typeof spawn> => {
  const launch = buildDevServerLaunch(server, options);

  return spawn(launch.command, launch.args, {
    cwd: launch.cwd,
    env: launch.env,
    stdio: "inherit",
  });
};

interface DevCommandDependencies {
  createWatcher: typeof createDevWatcher;
  getCliFilePath: () => string;
  getIntro: typeof intro;
  getOpen: typeof open;
  getLog: typeof log;
  parsePortValue: typeof parsePort;
  removeDirectory: typeof fs.rm;
  resolveDevPortValue: typeof resolveDevPort;
  resolveDocsRootValue: typeof resolveDocsRoot;
  resolveServer: typeof resolveDevServer;
  shutdownChild: typeof shutdownChildProcess;
  spawnServer: typeof spawnDevServer;
  validateDocsRootValue: typeof validateDocsRoot;
  waitForServerReady: typeof waitForServer;
}

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

const defaultDevCommandDependencies: DevCommandDependencies = {
  createWatcher: createDevWatcher,
  getCliFilePath: () => fileURLToPath(import.meta.url),
  getIntro: intro,
  getLog: log,
  getOpen: open,
  parsePortValue: parsePort,
  removeDirectory: fs.rm,
  resolveDevPortValue: resolveDevPort,
  resolveDocsRootValue: resolveDocsRoot,
  resolveServer: resolveDevServer,
  shutdownChild: shutdownChildProcess,
  spawnServer: spawnDevServer,
  validateDocsRootValue: validateDocsRoot,
  waitForServerReady: waitForServer,
};

// --- Main command ---

export const devCommand = async (
  {
    dir,
    openBrowser,
    port: portValue,
  }: {
    dir?: string;
    openBrowser: boolean;
    port: string;
  },
  dependencies: DevCommandDependencies = defaultDevCommandDependencies
) => {
  const cliLog = dependencies.getLog;

  dependencies.getIntro(chalk.bold("blodemd dev"));

  try {
    const port = dependencies.parsePortValue(portValue);
    const resolvedPort = await dependencies.resolveDevPortValue(port);
    const root = await dependencies.resolveDocsRootValue(dir);
    await dependencies.validateDocsRootValue(root);

    const cliFilePath = dependencies.getCliFilePath();
    const server = await dependencies.resolveServer(cliFilePath);
    const localUrl = `http://localhost:${resolvedPort}`;

    cliLog.info(`Docs root: ${chalk.cyan(root)}`);

    const child = dependencies.spawnServer(server, {
      port: resolvedPort,
      root,
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

      await dependencies.shutdownChild(child);

      if (server.mode === "standalone") {
        await dependencies.removeDirectory(server.runtimeRoot, {
          force: true,
          recursive: true,
        });
      }
    };

    process.once("SIGINT", closeAll);
    process.once("SIGTERM", closeAll);

    try {
      await dependencies.waitForServerReady({ child, port: resolvedPort });

      watcher = await dependencies.createWatcher({ port: resolvedPort, root });
      cliLog.success(`Dev server running at ${chalk.cyan(localUrl)}`);

      if (openBrowser) {
        await dependencies.getOpen(localUrl);
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

    cliLog.error(cliError.message);
    if (cliError.hint) {
      cliLog.info(cliError.hint);
    }

    process.exitCode = cliError.exitCode;
  }
};
