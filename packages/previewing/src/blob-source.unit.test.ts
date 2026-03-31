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
