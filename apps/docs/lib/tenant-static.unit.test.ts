import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildTenantLlmsFullTxt,
  buildTenantLlmsTxt,
  buildTenantRobotsTxt,
  buildTenantSitemapXml,
  getLlmPageText,
} from "./tenant-static";

const tempRoots: string[] = [];

const createTempUtilityRoot = async (
  files: Record<string, string>
): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tenant-static-"));
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

const tenant = {
  customDomains: ["docs.example.com"],
  docsPath: path.resolve(process.cwd(), "apps/docs/content/example"),
  id: "tenant-id",
  name: "Example",
  primaryDomain: "docs.example.com",
  slug: "example",
  status: "active" as const,
  subdomain: "example",
};

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (root) => {
      await fs.rm(root, { force: true, recursive: true });
    })
  );
});

describe("tenant static LLM helpers", () => {
  it("includes visible OpenAPI pages in llms outputs", async () => {
    const content = await buildTenantLlmsTxt(tenant);

    expect(content).toContain(
      "[List projects](https://docs.example.com/api/get-projects)"
    );
  });

  it("renders OpenAPI pages as markdown text", async () => {
    const content = await getLlmPageText(tenant, "api/get-projects");

    expect(content).toContain("# List projects");
    expect(content).toContain("Method: GET");
    expect(content).toContain("Path: /projects");
  });

  it("includes OpenAPI bodies in llms-full output", async () => {
    const content = await buildTenantLlmsFullTxt(tenant);

    expect(content).toContain(
      "# List projects (https://docs.example.com/api/get-projects)"
    );
    expect(content).toContain("Method: GET");
    expect(content).toContain("Path: /projects");
  });

  it("prefixes static helper URLs for path-based tenants", async () => {
    const context = {
      requestedHost: "blode.md",
      strategy: "path" as const,
    };

    const llms = await buildTenantLlmsTxt(tenant, context);
    const robots = buildTenantRobotsTxt(tenant, context);
    const sitemap = await buildTenantSitemapXml(tenant, context);

    expect(llms).toContain("Sitemap: https://blode.md/example/sitemap.xml");
    expect(llms).toContain(
      "[List projects](https://blode.md/example/api/get-projects)"
    );
    expect(robots).toContain("Sitemap: https://blode.md/example/sitemap.xml");
    expect(robots).toContain("# https://blode.md/example/llms.txt");
    expect(sitemap).toContain(
      "<loc>https://blode.md/example/api/get-projects</loc>"
    );
  });

  it("preserves custom-domain docs path prefixes in static helper URLs", async () => {
    const prefixedTenant = {
      ...tenant,
      customDomains: ["donebear.com"],
      pathPrefix: "/docs",
      primaryDomain: "donebear.com",
    };
    const context = {
      basePath: "/docs",
      requestedHost: "donebear.com",
      strategy: "custom-domain" as const,
    };

    const llms = await buildTenantLlmsTxt(prefixedTenant, context);
    const robots = buildTenantRobotsTxt(prefixedTenant, context);
    const sitemap = await buildTenantSitemapXml(prefixedTenant, context);

    expect(llms).toContain("Sitemap: https://donebear.com/docs/sitemap.xml");
    expect(llms).toContain(
      "[List projects](https://donebear.com/docs/api/get-projects)"
    );
    expect(robots).toContain("Sitemap: https://donebear.com/docs/sitemap.xml");
    expect(robots).toContain("# https://donebear.com/docs/llms.txt");
    expect(sitemap).toContain(
      "<loc>https://donebear.com/docs/api/get-projects</loc>"
    );
  });

  it("prefers published utility artifacts when they exist", async () => {
    const docsPath = await createTempUtilityRoot({
      "_utility/llms-full.txt":
        "# Overview (__BLODEMD_DOCS_ROOT__/)\n\nPublished full text",
      "_utility/llms-pages/index.mdx": "# Overview\n\nPublished page text",
      "_utility/llms.txt":
        "# Prebuilt Docs\n\nSitemap: __BLODEMD_DOCS_ROOT__/sitemap.xml",
      "_utility/sitemap.xml":
        "<urlset><url><loc>__BLODEMD_DOCS_ROOT__/</loc></url></urlset>",
    });
    const prebuiltTenant = {
      ...tenant,
      customDomains: [],
      docsPath,
    };
    const context = {
      requestedHost: "blode.md",
      strategy: "path" as const,
    };

    await expect(
      buildTenantLlmsTxt(prebuiltTenant, context)
    ).resolves.toContain("Sitemap: https://blode.md/example/sitemap.xml");
    await expect(
      buildTenantLlmsFullTxt(prebuiltTenant, context)
    ).resolves.toContain("# Overview (https://blode.md/example/)");
    await expect(
      buildTenantSitemapXml(prebuiltTenant, context)
    ).resolves.toContain("<loc>https://blode.md/example/</loc>");
    await expect(getLlmPageText(prebuiltTenant, "index")).resolves.toBe(
      "# Overview\n\nPublished page text"
    );
  });

  it("does not duplicate a matching page heading in runtime LLM output", async () => {
    const docsPath = await createTempUtilityRoot({
      "docs.json": JSON.stringify(
        {
          $schema: "https://blode.md/docs.json",
          name: "Example Docs",
          navigation: {
            groups: [{ group: "Docs", pages: ["guide"] }],
          },
        },
        null,
        2
      ),
      "guide.mdx": "---\ntitle: Guide\n---\n# Guide\n\nShip it.\n",
    });
    const runtimeTenant = {
      ...tenant,
      customDomains: [],
      docsPath,
      primaryDomain: "example.blode.md",
    };

    await expect(buildTenantLlmsFullTxt(runtimeTenant)).resolves.toContain(
      "# Guide (https://example.blode.md/guide)\n\nShip it."
    );
    await expect(getLlmPageText(runtimeTenant, "guide")).resolves.toBe(
      "# Guide\n\nShip it."
    );
  });
});
