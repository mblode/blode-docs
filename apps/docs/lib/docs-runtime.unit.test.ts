import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildContentIndex,
  buildUtilityIndex,
  createFsSource,
  loadSiteConfig,
} from "@repo/previewing";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  clearDocsRuntimeCaches as ClearDocsRuntimeCaches,
  getDocShellData as GetDocShellData,
  getTenantSearchItems as GetTenantSearchItems,
} from "./docs-runtime";

const tenantMocks = vi.hoisted(() => ({
  getTenantBySlug: vi.fn(),
}));

vi.mock("@/lib/tenants", () => ({
  getTenantBySlug: tenantMocks.getTenantBySlug,
}));

vi.mock("@/lib/mdx", () => ({
  renderFromCompiled: vi.fn(),
  renderMdx: vi.fn(),
}));

const tempRoots: string[] = [];

const createDocsRoot = async (files: Record<string, string>) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "docs-runtime-"));
  tempRoots.push(root);

  await Promise.all(
    Object.entries(files).map(async ([relativePath, content]) => {
      const absolutePath = path.join(root, relativePath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, content);
    })
  );

  return root;
};

let getTenantSearchItems: typeof GetTenantSearchItems;
let getDocShellData: typeof GetDocShellData;
let clearDocsRuntimeCaches: typeof ClearDocsRuntimeCaches;

describe("getTenantSearchItems", () => {
  beforeAll(async () => {
    ({ clearDocsRuntimeCaches, getDocShellData, getTenantSearchItems } =
      await import("./docs-runtime"));
  });

  beforeEach(() => {
    tenantMocks.getTenantBySlug.mockReset();
    clearDocsRuntimeCaches();
  });

  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map(async (root) => {
        await fs.rm(root, { force: true, recursive: true });
      })
    );
  });

  it("includes top-level OpenAPI pages when prebuilt search artifacts are missing", async () => {
    const docsPath = await createDocsRoot({
      "docs.json": JSON.stringify(
        {
          $schema: "https://mintlify.com/docs.json",
          api: {
            openapi: {
              directory: "api",
              source: "openapi.yaml",
            },
          },
          colors: {
            dark: "#0C3A33",
            light: "#CFF6EE",
            primary: "#0FB59F",
          },
          description: "Fixture docs",
          name: "Fixture Docs",
          navigation: {
            groups: [
              {
                group: "Guides",
                pages: ["index"],
              },
            ],
          },
          theme: "mint",
        },
        null,
        2
      ),
      "index.mdx": "---\ntitle: Overview\n---\n# Overview\n\nHello world.",
      "openapi.yaml": `openapi: 3.0.0
info:
  title: Fixture API
  version: 1.0.0
paths:
  /widgets:
    get:
      summary: List widgets
      responses:
        "200":
          description: OK
`,
    });

    const source = createFsSource(docsPath);
    const configResult = await loadSiteConfig(source);
    expect(configResult.ok).toBe(true);
    if (!configResult.ok) {
      return;
    }

    const contentIndex = await buildContentIndex(source, configResult.config);
    expect(contentIndex.errors).toEqual([]);
    const utilityIndex = await buildUtilityIndex(
      contentIndex,
      source,
      configResult.config
    );
    expect(utilityIndex.pages.map((page) => page.slug)).toContain(
      "api/get-widgets"
    );

    tenantMocks.getTenantBySlug.mockResolvedValue({
      customDomains: [],
      docsPath,
      id: "tenant-id",
      name: "Fixture Docs",
      primaryDomain: "fixture.blode.md",
      slug: "fixture-search-openapi",
      status: "active",
      subdomain: "fixture-search-openapi",
    });

    const items = await getTenantSearchItems("fixture-search-openapi");
    expect(tenantMocks.getTenantBySlug).toHaveBeenCalledWith(
      "fixture-search-openapi"
    );

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "api/get-widgets",
          title: "List widgets",
        }),
      ])
    );
  });
});

describe("getDocShellData", () => {
  beforeEach(() => {
    tenantMocks.getTenantBySlug.mockReset();
    clearDocsRuntimeCaches();
  });

  it("returns an unpublished state for tenants with no deployment and no local docs.json", async () => {
    const docsPath = await createDocsRoot({
      "README.md": "# Not a docs root\n",
    });

    tenantMocks.getTenantBySlug.mockResolvedValue({
      customDomains: [],
      docsPath,
      id: "tenant-id",
      name: "Atlas",
      primaryDomain: "atlas.blode.md",
      slug: "atlas",
      status: "active",
      subdomain: "atlas",
    });

    const result = await getDocShellData("atlas", "");

    expect(result).toEqual({
      emptyState: "unpublished",
      tenant: expect.objectContaining({
        docsPath,
        name: "Atlas",
        slug: "atlas",
      }),
    });
  });
});
