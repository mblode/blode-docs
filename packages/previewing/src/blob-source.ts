import path from "node:path";

import { normalizePath, shouldIgnoreRootDocsFile } from "@repo/common";

import type { CompiledMdxResult, ContentSource } from "./content-source.js";

interface BlobManifestFile {
  path: string;
  url: string;
}

interface BlobManifest {
  files: BlobManifestFile[];
  /** ISO 8601 publish time. Absent on manifests written before it existed. */
  publishedAt?: string;
}

type FetchInitWithNext = RequestInit & {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isBlobManifest = (value: unknown): value is BlobManifest => {
  if (!isRecord(value) || !Array.isArray(value.files)) {
    return false;
  }

  return value.files.every((file) => {
    if (!isRecord(file)) {
      return false;
    }

    return typeof file.path === "string" && typeof file.url === "string";
  });
};

const normalizeDirectory = (directory: string) => {
  const normalized = normalizePath(path.posix.normalize(directory));
  if (!normalized || normalized === ".") {
    return "";
  }
  return normalized ? `${normalized}/` : "";
};

const normalizeRelativePath = (value: string) =>
  normalizePath(path.posix.normalize(value));

export class BlobContentSource implements ContentSource {
  private readonly manifestUrl: string;
  private readonly cacheTag?: string;
  private manifestPromise?: Promise<{
    files: Map<string, string>;
    publishedAt: string | null;
  }>;

  constructor(manifestUrl: string, cacheTag?: string) {
    this.manifestUrl = manifestUrl;
    this.cacheTag = cacheTag;
  }

  private getFetchOptions(): FetchInitWithNext {
    if (!this.cacheTag) {
      return { cache: "no-store" };
    }

    return {
      next: {
        revalidate: 3600,
        tags: [this.cacheTag],
      },
    };
  }

  private async loadManifest(): Promise<{
    files: Map<string, string>;
    publishedAt: string | null;
  }> {
    if (!this.manifestPromise) {
      this.manifestPromise = (async () => {
        const response = await fetch(this.manifestUrl, this.getFetchOptions());
        if (!response.ok) {
          throw new Error(
            `Failed to load deployment manifest: ${response.status}`
          );
        }

        const manifest = (await response.json()) as unknown;
        if (!isBlobManifest(manifest)) {
          throw new Error("Deployment manifest is invalid.");
        }

        return {
          files: new Map(
            manifest.files.map((file) => [
              normalizeRelativePath(file.path),
              file.url,
            ])
          ),
          publishedAt:
            typeof manifest.publishedAt === "string"
              ? manifest.publishedAt
              : null,
        };
      })();
    }

    return await this.manifestPromise;
  }

  async readFile(relativePath: string): Promise<string> {
    const url = await this.resolveUrl(relativePath);
    if (!url) {
      throw new Error(`Content file "${relativePath}" not found.`);
    }

    const response = await fetch(url, this.getFetchOptions());
    if (!response.ok) {
      throw new Error(`Failed to load content file: ${response.status}`);
    }

    return await response.text();
  }

  async listFiles(directory: string): Promise<string[]> {
    const manifest = await this.loadManifest();
    const prefix = normalizeDirectory(directory);

    const files: string[] = [];
    for (const file of manifest.files.keys()) {
      if (prefix && !file.startsWith(prefix)) {
        continue;
      }
      // Return paths relative to the listed directory, matching
      // FsContentSource so callers can join them onto the collection root.
      const relativePath = prefix ? file.slice(prefix.length) : file;
      if (!relativePath) {
        continue;
      }
      // Only top-level entries of the listed directory are subject to the
      // root-docs-file ignore list, again matching FsContentSource.
      if (
        !relativePath.includes("/") &&
        shouldIgnoreRootDocsFile(relativePath)
      ) {
        continue;
      }
      files.push(relativePath);
    }
    // oxlint-disable-next-line eslint-plugin-unicorn/no-array-sort
    files.sort();
    return files;
  }

  async exists(relativePath: string): Promise<boolean> {
    const manifest = await this.loadManifest();
    return manifest.files.has(normalizeRelativePath(relativePath));
  }

  async publishedAt(): Promise<string | null> {
    const manifest = await this.loadManifest();
    return manifest.publishedAt;
  }

  async resolveUrl(relativePath: string): Promise<string | null> {
    const manifest = await this.loadManifest();
    return manifest.files.get(normalizeRelativePath(relativePath)) ?? null;
  }

  async readCompiledMdx(
    relativePath: string
  ): Promise<CompiledMdxResult | null> {
    const compiledPath = `_compiled/${normalizeRelativePath(relativePath)}.json`;
    const url = await this.resolveUrl(compiledPath);
    if (!url) {
      return null;
    }

    try {
      const response = await fetch(url, this.getFetchOptions());
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as CompiledMdxResult;
      if (!data.compiledSource || data.version !== 1) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }
}

export const createBlobSource = (
  manifestUrl: string,
  cacheTag?: string
): ContentSource => new BlobContentSource(manifestUrl, cacheTag);
