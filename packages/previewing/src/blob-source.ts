import path from "node:path";

import { normalizePath } from "@repo/common";

import type { ContentSource } from "./content-source.js";

interface BlobManifestFile {
  path: string;
  url: string;
}

interface BlobManifest {
  files: BlobManifestFile[];
}

type FetchInitWithNext = RequestInit & {
  next?: {
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
  private manifestPromise?: Promise<Map<string, string>>;

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
        tags: [this.cacheTag],
      },
    };
  }

  private async loadManifest(): Promise<Map<string, string>> {
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

        return new Map(
          manifest.files.map((file) => [
            normalizeRelativePath(file.path),
            file.url,
          ])
        );
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

    const files = [...manifest.keys()].filter((file) =>
      prefix ? file.startsWith(prefix) : true
    );
    // oxlint-disable-next-line eslint-plugin-unicorn/no-array-sort
    files.sort();
    return files;
  }

  async exists(relativePath: string): Promise<boolean> {
    const manifest = await this.loadManifest();
    return manifest.has(normalizeRelativePath(relativePath));
  }

  async resolveUrl(relativePath: string): Promise<string | null> {
    const manifest = await this.loadManifest();
    return manifest.get(normalizeRelativePath(relativePath)) ?? null;
  }
}

export const createBlobSource = (
  manifestUrl: string,
  cacheTag?: string
): ContentSource => new BlobContentSource(manifestUrl, cacheTag);
