import path from "node:path";

import { log } from "@clack/prompts";
import { watch } from "chokidar";

const INVALIDATE_ENDPOINT = "/blodemd-dev/invalidate";
const WATCH_DEBOUNCE_MS = 100;

const normalizeRelativePath = (root: string, filePath: string) =>
  path.relative(root, filePath).split(path.sep).join("/");

const isDirectoryEvent = (event: string) =>
  event === "addDir" || event === "unlinkDir";

export const createDevWatcher = ({
  port,
  root,
}: {
  port: number;
  root: string;
}) => {
  const watcher = watch(root, {
    ignoreInitial: true,
    ignored: ["**/.git/**", "**/.next/**", "**/dist/**", "**/node_modules/**"],
  });

  let flushTimer: NodeJS.Timeout | null = null;
  let pendingKind: "config" | "content" = "content";
  const pendingPaths = new Set<string>();

  const flush = async () => {
    flushTimer = null;

    const paths = [...pendingPaths];
    const kind = pendingKind;
    pendingPaths.clear();
    pendingKind = "content";

    if (!paths.length) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:${port}${INVALIDATE_ENDPOINT}`,
        {
          body: JSON.stringify({ kind, paths }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      log.error(
        `Failed to invalidate preview cache: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  };

  watcher.on("all", (event, changedPath) => {
    if (isDirectoryEvent(event)) {
      return;
    }

    const relativePath = normalizeRelativePath(root, changedPath);
    pendingPaths.add(relativePath);

    if (path.basename(changedPath) === "docs.json") {
      pendingKind = "config";
    }

    if (flushTimer) {
      clearTimeout(flushTimer);
    }

    flushTimer = setTimeout(() => {
      flush();
    }, WATCH_DEBOUNCE_MS);
  });

  return {
    async close() {
      if (flushTimer) {
        clearTimeout(flushTimer);
        await flush();
      }

      await watcher.close();
    },
  };
};
