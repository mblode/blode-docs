import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildUtilityArtifacts,
  buildSearchIndex,
  buildContentIndex,
  buildUtilityIndex,
  createFsSource,
  getPrebuiltUtilityLlmPagePath,
  loadPrebuiltUtilityIndex,
  loadSiteConfig,
  PREBUILT_UTILITY_LLMS_FULL_PATH,
  PREBUILT_UTILITY_LLMS_PATH,
  PREBUILT_UTILITY_INDEX_PATH,
  PREBUILT_UTILITY_SITEMAP_PATH,
  UTILITY_DOCS_ROOT_TOKEN,
  serializeUtilityIndex,
} from "./index";

const tempRoots: string[] = [];

const createTempContentRoot = async (files: Record<string, string>) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "previewing-"));
  tempRoots.push(root);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content);
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

describe("loadSiteConfig", () => {
  it("loads docs.json as the only supported config file", async () => {
    const root = await createTempContentRoot({
      "config/navigation.json": JSON.stringify(
        {
          groups: [{ group: "Getting Started", pages: ["index"] }],
        },
        null,
        2
      ),
      "docs.json": JSON.stringify(
        {
          $schema: "https://mintlify.com/docs.json",
          api: {
            openapi: "openapi.yaml",
            playground: {
              proxy: true,
            },
          },
          appearance: {
            strict: true,
          },
          colors: {
            primary: "#171717",
          },
          fonts: {
            family: "Inter",
          },
          name: "Example Docs",
          navbar: {
            links: [{ href: "https://example.com", label: "Website" }],
          },
          navigation: {
            $ref: "./config/navigation.json",
          },
          theme: "mint",
        },
        null,
        2
      ),
      "index.mdx": "---\ntitle: Welcome\n---\n",
    });

    const result = await loadSiteConfig(createFsSource(root));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.warnings).toEqual([]);
    expect(result.config.name).toBe("Example Docs");
    expect(result.config.collections).toHaveLength(1);
    expect(result.config.collections[0]?.openapi).toBe("openapi.yaml");
    expect(result.config.navigation?.groups).toEqual([
      { group: "Getting Started", pages: ["index"] },
    ]);
    expect(result.config.navigation?.global?.links).toEqual([
      { href: "https://example.com", label: "Website" },
    ]);
    expect(result.config.features?.themeToggle).toBe(false);
    expect(result.config.openapiProxy?.enabled).toBe(true);
    expect(result.config.fonts?.cssUrl).toContain("Inter");
  });

  it("errors when docs.json is missing", async () => {
    const root = await createTempContentRoot({
      "site.json": JSON.stringify({ name: "Old config" }, null, 2),
    });

    const result = await loadSiteConfig(createFsSource(root));

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors).toEqual(["docs.json not found."]);
  });

  it("loads the shipped tenant docs roots", async () => {
    const atlasResult = await loadSiteConfig(
      createFsSource(path.resolve(process.cwd(), "apps/docs/content/atlas"))
    );
    const blodeResult = await loadSiteConfig(
      createFsSource(path.resolve(process.cwd(), "apps/docs/content/blode"))
    );

    expect(atlasResult.ok).toBe(true);
    expect(blodeResult.ok).toBe(true);

    if (!atlasResult.ok || !blodeResult.ok) {
      return;
    }

    expect(atlasResult.config.collections[0]?.openapi).toEqual({
      directory: "api",
      source: "openapi.yaml",
    });
    expect(atlasResult.config.openapiProxy?.enabled).toBe(true);
    expect(blodeResult.config.navigation?.groups).toMatchObject([
      {
        group: "Getting Started",
        pages: ["index", "installation"],
      },
      {
        group: "Customization",
        pages: ["typography", "theming"],
      },
      {
        group: "Components",
        pages: ["components/breadcrumb"],
      },
    ]);
    expect(blodeResult.config.navigation?.groups).toHaveLength(3);
  });
});

describe("buildUtilityIndex", () => {
  it("prebuilds content and OpenAPI utility pages", async () => {
    const root = await createTempContentRoot({
      "docs.json": JSON.stringify(
        {
          $schema: "https://mintlify.com/docs.json",
          api: {
            openapi: "openapi.yaml",
          },
          appearance: {
            strict: true,
          },
          colors: {
            primary: "#171717",
          },
          fonts: {
            family: "Inter",
          },
          name: "Example Docs",
          navbar: {
            links: [{ href: "https://example.com", label: "Website" }],
          },
          navigation: {
            groups: [{ group: "Docs", pages: ["index", "guide"] }],
          },
          theme: "mint",
        },
        null,
        2
      ),
      "guide.mdx": "---\ntitle: Guide\n---\n# Guide\n\nShip it.\n",
      "hidden.mdx": "---\ntitle: Hidden\nhidden: true\n---\n# Hidden\n",
      "index.mdx": "---\ntitle: Welcome\n---\n# Welcome\n\nHello there.\n",
      "openapi.yaml": [
        "openapi: 3.0.0",
        "paths:",
        "  /projects:",
        "    get:",
        "      summary: List projects",
        "      description: Return every project.",
        "      tags:",
        "        - Projects",
        "      responses:",
        "        '200':",
        "          description: OK",
      ].join("\n"),
    });
    const source = createFsSource(root);
    const configResult = await loadSiteConfig(source);

    expect(configResult.ok).toBe(true);
    if (!configResult.ok) {
      return;
    }

    const contentIndex = await buildContentIndex(source, configResult.config);
    const utilityIndex = await buildUtilityIndex(
      contentIndex,
      source,
      configResult.config
    );

    expect(utilityIndex.name).toBe("Example Docs");
    expect(utilityIndex.pages.map((page) => page.slug)).toEqual([
      "api/get-projects",
      "guide",
      "index",
    ]);
    expect(utilityIndex.pages.find((page) => page.slug === "hidden")).toBe(
      undefined
    );
    expect(
      utilityIndex.pages.find((page) => page.slug === "api/get-projects")
        ?.content
    ).toContain("Method: GET");

    expect(
      buildSearchIndex(contentIndex, configResult.config, utilityIndex)
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "api/get-projects",
          title: "List projects",
        }),
      ])
    );

    const artifacts = buildUtilityArtifacts(utilityIndex);
    expect(artifacts.map((artifact) => artifact.path)).toContain(
      PREBUILT_UTILITY_SITEMAP_PATH
    );
    expect(artifacts.map((artifact) => artifact.path)).toContain(
      PREBUILT_UTILITY_LLMS_PATH
    );
    expect(artifacts.map((artifact) => artifact.path)).toContain(
      PREBUILT_UTILITY_LLMS_FULL_PATH
    );
    expect(artifacts.map((artifact) => artifact.path)).toContain(
      getPrebuiltUtilityLlmPagePath("guide")
    );
    expect(
      artifacts.find(
        (artifact) => artifact.path === PREBUILT_UTILITY_SITEMAP_PATH
      )?.content
    ).toContain(`${UTILITY_DOCS_ROOT_TOKEN}/api/get-projects`);

    await fs.writeFile(
      path.join(root, PREBUILT_UTILITY_INDEX_PATH),
      serializeUtilityIndex(utilityIndex)
    );

    await expect(loadPrebuiltUtilityIndex(source)).resolves.toEqual(
      utilityIndex
    );
  });
});
