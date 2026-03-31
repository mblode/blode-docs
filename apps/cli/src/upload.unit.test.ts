import path from "node:path";

import { describe, expect, it } from "vitest";

import { createUploadBatches } from "./upload.js";

describe("createUploadBatches", () => {
  it("yields batches incrementally instead of buffering every file first", async () => {
    const root = "/docs";
    const files = [
      path.join(root, "a.mdx"),
      path.join(root, "b.mdx"),
      path.join(root, "c.mdx"),
    ];
    const reads: string[] = [];
    const batches = createUploadBatches({
      files,
      maxBatchBytes: 100,
      readFile: (filePath: string) => {
        reads.push(path.basename(filePath));
        return Promise.resolve(Buffer.from("1234567890"));
      },
      root,
    });

    const first = await batches.next();
    expect(first.value).toHaveLength(1);
    expect(first.value?.[0]?.path).toBe("a.mdx");
    expect(reads).toEqual(["a.mdx", "b.mdx"]);

    const second = await batches.next();
    expect(second.value).toHaveLength(1);
    expect(second.value?.[0]?.path).toBe("b.mdx");
    expect(reads).toEqual(["a.mdx", "b.mdx", "c.mdx"]);
  });

  it("uses relative paths and content types in each batch item", async () => {
    const root = "/docs";
    const filePath = path.join(root, "guides", "intro.mdx");
    const batches = createUploadBatches({
      files: [filePath],
      maxBatchBytes: 10_000,
      readFile: () => Promise.resolve(Buffer.from("# Hello")),
      root,
    });

    const { value } = await batches.next();
    expect(value).toEqual([
      {
        contentBase64: Buffer.from("# Hello").toString("base64"),
        contentType: "text/markdown; charset=utf-8",
        path: "guides/intro.mdx",
      },
    ]);
  });

  it("fails when a single file exceeds the batch limit", async () => {
    const batches = createUploadBatches({
      files: ["/docs/huge.mdx"],
      maxBatchBytes: 80,
      readFile: () => Promise.resolve(Buffer.from("0123456789")),
      root: "/docs",
    });

    await expect(batches.next()).rejects.toThrowError(
      /too large to upload in a single request/
    );
  });

  it("skips root helper files from upload batches", async () => {
    const root = "/docs";
    const batches = createUploadBatches({
      files: [
        path.join(root, "README.md"),
        path.join(root, "AGENTS.md"),
        path.join(root, "guide.mdx"),
      ],
      maxBatchBytes: 10_000,
      readFile: () => Promise.resolve(Buffer.from("# Hello")),
      root,
    });

    const { value } = await batches.next();
    expect(value).toEqual([
      {
        contentBase64: Buffer.from("# Hello").toString("base64"),
        contentType: "text/markdown; charset=utf-8",
        path: "guide.mdx",
      },
    ]);
  });
});
