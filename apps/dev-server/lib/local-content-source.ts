import fs from "node:fs/promises";
import path from "node:path";

import { normalizePath } from "@repo/common";
import type { ContentSource } from "@repo/previewing";
import { createFsSource } from "@repo/previewing";

const BINARY_CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".otf": "font/otf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const TEXT_CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mdx": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".yaml": "application/yaml; charset=utf-8",
  ".yml": "application/yaml; charset=utf-8",
};

const isWithinRoot = (root: string, candidate: string) =>
  candidate === root || candidate.startsWith(`${root}${path.sep}`);

const getDocsRoot = () => {
  const root = process.env.DOCS_ROOT?.trim();

  if (!root) {
    throw new Error("DOCS_ROOT is required for the local dev server.");
  }

  return path.resolve(root);
};

const resolveDocsPath = (relativePath: string) => {
  const root = getDocsRoot();
  const normalized = normalizePath(relativePath);
  const absolutePath = path.resolve(root, normalized);

  if (!isWithinRoot(root, absolutePath)) {
    throw new Error(`Path "${relativePath}" escapes DOCS_ROOT.`);
  }

  return absolutePath;
};

const toStaticAssetUrl = (relativePath: string) => {
  const normalized = normalizePath(relativePath);

  if (!normalized || normalized === ".") {
    return "/blodemd-dev/static";
  }

  return `/blodemd-dev/static/${normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
};

export const createPreviewContentSource = (): ContentSource => {
  const source = createFsSource(getDocsRoot());

  return {
    exists(relativePath) {
      return source.exists(relativePath);
    },
    listFiles(directory) {
      return source.listFiles(directory);
    },
    readFile(relativePath) {
      return source.readFile(relativePath);
    },
    resolveUrl(relativePath) {
      return toStaticAssetUrl(relativePath);
    },
  };
};

export const readStaticAsset = async (relativePath: string) =>
  await fs.readFile(resolveDocsPath(relativePath));

export const getStaticAssetContentType = (relativePath: string) => {
  const extension = path.extname(relativePath).toLowerCase();

  return (
    TEXT_CONTENT_TYPES[extension] ??
    BINARY_CONTENT_TYPES[extension] ??
    "application/octet-stream"
  );
};
