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
  extractToc,
  getPrebuiltUtilityLlmPagePath,
  LEGACY_PROJECT_NAME_FALLBACK_WARNING,
  loadPrebuiltUtilityIndex,
  loadSiteConfig,
  PREBUILT_UTILITY_LLMS_FULL_PATH,
  PREBUILT_UTILITY_LLMS_PATH,
  PREBUILT_UTILITY_INDEX_PATH,
  PREBUILT_UTILITY_SITEMAP_PATH,
  UTILITY_DOCS_ROOT_TOKEN,
  serializeUtilityIndex,
  toAgentMarkdown,
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
          $schema: "https://blode.md/docs.json",
          api: {
            openapi: "openapi.yaml",
            playground: {
              proxy: true,
            },
          },
          appearance: {
            strict: true,
          },
          logo: {
            dark: "/logo-dark.svg",
            href: "https://example.com",
            light: "/logo-light.svg",
          },
          name: "Example Docs",
          navbar: {
            links: [{ href: "https://example.com", label: "Website" }],
          },
          navigation: {
            $ref: "./config/navigation.json",
          },
          slug: "example-docs",
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
    expect(result.config.slug).toBe("example-docs");
    expect(result.config.collections).toHaveLength(1);
    expect(result.config.collections[0]?.openapi).toBe("openapi.yaml");
    expect(result.config.navigation?.groups).toEqual([
      { group: "Getting Started", pages: ["index"] },
    ]);
    expect(result.config.navigation?.global?.links).toEqual([
      { href: "https://example.com", label: "Website" },
    ]);
    expect(result.config.logo).toEqual({
      dark: "/logo-dark.svg",
      href: "https://example.com",
      light: "/logo-light.svg",
    });
    expect(result.config.features?.themeToggle).toBe(false);
    expect(result.config.openapiProxy?.enabled).toBe(true);
  });

  it("loads SiteConfig-format docs.json with theme and colors", async () => {
    const root = await createTempContentRoot({
      "docs.json": JSON.stringify(
        {
          collections: [
            {
              id: "docs",
              navigation: {
                groups: [{ group: "Docs", pages: ["index"] }],
              },
              root: "docs",
              slugPrefix: "docs",
              type: "docs",
            },
          ],
          colors: { primary: "#6366f1" },
          name: "Site Config Test",
          slug: "site-config-test",
          theme: "almond",
        },
        null,
        2
      ),
      "docs/index.mdx": "---\ntitle: Welcome\n---\n",
    });

    const result = await loadSiteConfig(createFsSource(root));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.config.name).toBe("Site Config Test");
    expect(result.config.slug).toBe("site-config-test");
    expect(result.config.theme).toBe("almond");
    expect(result.config.colors?.primary).toBe("#6366f1");
    expect(result.config.collections).toHaveLength(1);
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

  it("warns when docs.json.slug is missing", async () => {
    const root = await createTempContentRoot({
      "docs.json": JSON.stringify(
        {
          $schema: "https://blode.md/docs.json",
          name: "Legacy Docs",
          navigation: {
            groups: [{ group: "Docs", pages: ["index"] }],
          },
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

    expect(result.warnings).toEqual([LEGACY_PROJECT_NAME_FALLBACK_WARNING]);
  });

  it("loads the shipped docs tenant root", async () => {
    const docsResult = await loadSiteConfig(
      createFsSource(path.resolve(process.cwd(), "apps/docs/content/docs"))
    );

    expect(docsResult.ok).toBe(true);

    if (!docsResult.ok) {
      return;
    }

    expect(docsResult.config.slug).toBe("docs");
    expect(docsResult.config.navigation?.tabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          groups: expect.arrayContaining([
            expect.objectContaining({
              group: "Getting started",
              pages: ["index", "quickstart", "how-it-works"],
            }),
          ]),
          label: "Documentation",
        }),
        expect.objectContaining({
          groups: expect.arrayContaining([
            expect.objectContaining({
              group: "Content",
              pages: expect.arrayContaining([
                "components/callout",
                "components/card",
              ]),
            }),
          ]),
          label: "Components",
        }),
        expect.objectContaining({
          groups: expect.arrayContaining([
            expect.objectContaining({
              group: "CLI",
              pages: expect.arrayContaining(["cli/overview", "cli/login"]),
            }),
          ]),
          label: "CLI reference",
        }),
      ])
    );
    expect(docsResult.config.navigation?.tabs).toHaveLength(3);
  });
});

describe("buildUtilityIndex", () => {
  it("prebuilds content and OpenAPI utility pages", async () => {
    const root = await createTempContentRoot({
      "docs.json": JSON.stringify(
        {
          $schema: "https://blode.md/docs.json",
          api: {
            openapi: "openapi.yaml",
          },
          appearance: {
            strict: true,
          },
          name: "Example Docs",
          navbar: {
            links: [{ href: "https://example.com", label: "Website" }],
          },
          navigation: {
            groups: [{ group: "Docs", pages: ["index", "guide"] }],
          },
          slug: "example-docs",
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

    const artifacts = buildUtilityArtifacts(utilityIndex, {
      publishedAt: "2026-09-07T04:05:06.000Z",
    });
    const sitemapContent = artifacts.find(
      (artifact) => artifact.path === PREBUILT_UTILITY_SITEMAP_PATH
    )?.content;
    expect(sitemapContent).toContain(
      "<lastmod>2026-09-07T04:05:06.000Z</lastmod>"
    );
    expect(
      buildUtilityArtifacts(utilityIndex).find(
        (artifact) => artifact.path === PREBUILT_UTILITY_SITEMAP_PATH
      )?.content
    ).not.toContain("<lastmod>");
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
    // The index page is the docs root itself. A trailing slash here redirects
    // to the canonical URL, which puts a 3xx in every published sitemap.
    expect(
      artifacts.find(
        (artifact) => artifact.path === PREBUILT_UTILITY_SITEMAP_PATH
      )?.content
    ).toContain(`<loc>${UTILITY_DOCS_ROOT_TOKEN}</loc>`);
    expect(
      artifacts.find(
        (artifact) => artifact.path === PREBUILT_UTILITY_LLMS_FULL_PATH
      )?.content
    ).toContain("# Guide (__BLODEMD_DOCS_ROOT__/guide)\n\nShip it.");
    expect(
      artifacts.find((artifact) => artifact.path === PREBUILT_UTILITY_LLMS_PATH)
        ?.content
    ).toContain("[Guide](__BLODEMD_DOCS_ROOT__/guide.md)");
    expect(
      artifacts.find((artifact) => artifact.path === PREBUILT_UTILITY_LLMS_PATH)
        ?.content
    ).toContain("Full content: __BLODEMD_DOCS_ROOT__/llms-full.txt");
    expect(
      artifacts.find((artifact) => artifact.path === "_utility/llms/docs.txt")
        ?.content
    ).toContain("# Example Docs - Docs");
    expect(
      artifacts.find(
        (artifact) => artifact.path === getPrebuiltUtilityLlmPagePath("guide")
      )?.content
    ).toBe("# Guide\n\nShip it.");

    await fs.writeFile(
      path.join(root, PREBUILT_UTILITY_INDEX_PATH),
      serializeUtilityIndex(utilityIndex)
    );

    await expect(loadPrebuiltUtilityIndex(source)).resolves.toEqual(
      utilityIndex
    );
  });
});

describe("toAgentMarkdown", () => {
  it("keeps MDX card bodies from the shipped docs index", async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), "apps/docs/content/docs/index.mdx"),
      "utf8"
    );
    const output = toAgentMarkdown(source);

    expect(output).toContain("### [30+ MDX components](/components/callout)");
    expect(output).toContain("Callouts, tabs, steps, code groups");
    expect(output).toContain("Push from your terminal or automate");
    expect(output).toContain("Every project gets a `*.blode.md` subdomain");
    expect(output).toContain("Drop in an OpenAPI spec");
    expect(output).toContain("Full-text search with Cmd+K");
    expect(output).toContain("Auto-generated sitemaps, robots.txt");
  });

  it("preserves inline code spans that mention MDX component tags", () => {
    const output = toAgentMarkdown(
      "Wrap fenced code blocks inside `<CodeGroup>` and switch with `<Tabs>`."
    );

    expect(output).toContain("`<CodeGroup>`");
    expect(output).toContain("`<Tabs>`");
  });

  it("preserves regex replacement patterns inside code", () => {
    const source = [
      "```js",
      "str.replace(/(\\w+)/, '$1-$&-$`-$$');",
      "```",
      "",
      "Inline `sed 's/a/$&/g'` too.",
    ].join("\n");
    const output = toAgentMarkdown(source);

    expect(output).toContain("str.replace(/(\\w+)/, '$1-$&-$`-$$');");
    expect(output).toContain("`sed 's/a/$&/g'`");
  });

  it("renders accordion titles and bodies", () => {
    const output = toAgentMarkdown(`
<AccordionGroup>
  <Accordion title="Deployment limits">
    Fetch individual markdown pages for uncapped content.
  </Accordion>
</AccordionGroup>
`);

    expect(output).toContain("### Deployment limits");
    expect(output).toContain("Fetch individual markdown pages");
  });
});

describe("extractToc", () => {
  it("ignores headings inside tilde-fenced code blocks", () => {
    const toc = extractToc(
      ["## Real Heading", "", "~~~bash", "## not a heading", "~~~"].join("\n")
    );

    expect(toc.map((item) => item.title)).toEqual(["Real Heading"]);
  });

  it("makes duplicate ids unique without colliding with explicit suffixes", () => {
    const toc = extractToc(
      ["## Setup", "## Setup 1", "## Setup", "## Setup"].join("\n")
    );

    expect(toc.map((item) => item.id)).toEqual([
      "setup",
      "setup-1",
      "setup-2",
      "setup-3",
    ]);
  });
});
