import { afterEach, describe, expect, it, vi } from "vitest";

import { BlobContentSource } from "./blob-source.js";

describe("BlobContentSource", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores root helper files when listing manifest files", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          files: [
            { path: "README.md", url: "https://example.com/readme" },
            { path: "AGENTS.md", url: "https://example.com/agents" },
            { path: "index.mdx", url: "https://example.com/index" },
            { path: "guide.mdx", url: "https://example.com/guide" },
          ],
        },
        {
          status: 200,
        }
      )
    );

    const source = new BlobContentSource("https://example.com/manifest.json");

    await expect(source.listFiles("")).resolves.toEqual([
      "guide.mdx",
      "index.mdx",
    ]);
  });
});

describe("BlobContentSource.publishedAt", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the manifest publish time", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        files: [{ path: "index.mdx", url: "https://example.com/index" }],
        publishedAt: "2026-09-07T01:02:03.000Z",
        version: 1,
      })
    );

    const source = new BlobContentSource("https://example.com/manifest.json");
    expect(await source.publishedAt()).toBe("2026-09-07T01:02:03.000Z");
  });

  it("returns null for a manifest written before the field existed", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        files: [{ path: "index.mdx", url: "https://example.com/index" }],
      })
    );

    const source = new BlobContentSource("https://example.com/manifest.json");
    expect(await source.publishedAt()).toBeNull();
  });
});
