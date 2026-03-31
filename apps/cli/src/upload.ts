import fs from "node:fs/promises";
import path from "node:path";

import { shouldIgnoreRootDocsFile } from "@repo/common";

import { CliError, EXIT_CODES } from "./errors.js";

const TEXT_CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mdx": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".yaml": "application/yaml; charset=utf-8",
  ".yml": "application/yaml; charset=utf-8",
};

export interface UploadBatchItem {
  contentBase64: string;
  contentType: string;
  path: string;
}

type ReadFile = (filePath: string) => Promise<Buffer>;

const normalizeRelativePath = (root: string, filePath: string): string =>
  path.relative(root, filePath).split(path.sep).join("/");

const getContentType = (filePath: string): string =>
  TEXT_CONTENT_TYPES[path.extname(filePath).toLowerCase()] ??
  "application/octet-stream";

const estimateUploadItemBytes = (item: UploadBatchItem): number =>
  item.contentBase64.length + item.path.length + 64;

const createUploadBatchItem = async (
  filePath: string,
  root: string,
  readFile: ReadFile
): Promise<UploadBatchItem> => {
  const content = await readFile(filePath);

  return {
    contentBase64: content.toString("base64"),
    contentType: getContentType(filePath),
    path: normalizeRelativePath(root, filePath),
  };
};

export const createUploadBatches =
  async function* createUploadBatchesGenerator({
    files,
    maxBatchBytes,
    readFile = fs.readFile,
    root,
  }: {
    files: string[];
    maxBatchBytes: number;
    readFile?: ReadFile;
    root: string;
  }): AsyncGenerator<UploadBatchItem[]> {
    let currentBatch: UploadBatchItem[] = [];
    let currentBatchBytes = 0;

    for (const filePath of files) {
      const item = await createUploadBatchItem(filePath, root, readFile);
      if (shouldIgnoreRootDocsFile(item.path)) {
        continue;
      }
      const itemBytes = estimateUploadItemBytes(item);

      if (itemBytes > maxBatchBytes) {
        throw new CliError(
          `File "${item.path}" is too large to upload in a single request.`,
          EXIT_CODES.VALIDATION,
          "Split the file into smaller pieces or raise the server request limit."
        );
      }

      if (
        currentBatch.length > 0 &&
        currentBatchBytes + itemBytes > maxBatchBytes
      ) {
        yield currentBatch;
        currentBatch = [];
        currentBatchBytes = 0;
      }

      currentBatch.push(item);
      currentBatchBytes += itemBytes;
    }

    if (currentBatch.length > 0) {
      yield currentBatch;
    }
  };
