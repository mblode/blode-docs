import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { CliError } from "./errors.js";
import { loadValidatedSiteConfig } from "./site-config.js";

const tempRoots: string[] = [];

const createDocsRoot = async (
  files: Record<string, string>
): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "blodemd-site-config-"));
  tempRoots.push(root);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");
  }

  return root;
};

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (root) => {
      await fs.rm(root, { force: true, recursive: true });
    })
  );
});

describe("loadValidatedSiteConfig", () => {
  it("returns the validated site config and warnings", async () => {
    const root = await createDocsRoot({
      "docs.json": JSON.stringify(
        {
          $schema: "https://docs.blode.md/docs.json",
          colors: { primary: "#0D9373" },
          name: "example-docs",
          navigation: {
            groups: [{ group: "Getting Started", pages: ["index"] }],
          },
          theme: "mint",
        },
        null,
        2
      ),
      "index.mdx": "---\ntitle: Welcome\n---\n\nHello\n",
    });

    const result = await loadValidatedSiteConfig(root);

    expect(result.config.name).toBe("example-docs");
    expect(result.warnings).toEqual([]);
  });

  it("throws a CLI error when docs.json is missing or invalid", async () => {
    const root = await createDocsRoot({
      "index.mdx": "---\ntitle: Welcome\n---\n",
    });

    await expect(loadValidatedSiteConfig(root)).rejects.toBeInstanceOf(
      CliError
    );
  });
});
