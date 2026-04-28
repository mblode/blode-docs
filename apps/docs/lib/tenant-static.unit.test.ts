import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  absolutiseInternalLinks,
  buildTenantLlmsFullTxt,
  buildTenantLlmsTxt,
  buildTenantRobotsTxt,
  buildTenantSitemapXml,
  getLlmPageText,
  sanitizePlaceholderUrls,
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
  docsPath: "",
  id: "tenant-id",
  name: "Example",
  primaryDomain: "docs.example.com",
  slug: "example",
  status: "active" as const,
  subdomain: "example",
};

let openApiTenant = tenant;

beforeEach(async () => {
  const docsPath = await createTempUtilityRoot({
    "docs.json": JSON.stringify(
      {
        $schema: "https://blode.md/docs.json",
        api: {
          openapi: {
            directory: "api",
            source: "openapi.yaml",
          },
        },
        name: "Example Docs",
        navigation: {
          groups: [{ group: "API", pages: ["api/get-projects"] }],
        },
      },
      null,
      2
    ),
    "openapi.yaml": `openapi: 3.0.0
info:
  title: Example API
  version: 1.0.0
paths:
  /projects:
    get:
      summary: List projects
      responses:
        "200":
          description: OK
`,
  });
  openApiTenant = {
    ...tenant,
    docsPath,
  };
});

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (root) => {
      await fs.rm(root, { force: true, recursive: true });
    })
  );
});

describe("tenant static LLM helpers", () => {
  it("includes visible OpenAPI pages in llms outputs", async () => {
    const content = await buildTenantLlmsTxt(openApiTenant);

    expect(content).toContain(
      "[List projects](https://docs.example.com/api/get-projects.md)"
    );
  });

  it("renders OpenAPI pages as markdown text", async () => {
    const content = await getLlmPageText(openApiTenant, "api/get-projects");

    expect(content).toContain("# List projects");
    expect(content).toContain("Method: GET");
    expect(content).toContain("Path: /projects");
  });

  it("includes OpenAPI bodies in llms-full output", async () => {
    const content = await buildTenantLlmsFullTxt(openApiTenant);

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

    const llms = await buildTenantLlmsTxt(openApiTenant, context);
    const robots = buildTenantRobotsTxt(openApiTenant, context);
    const sitemap = await buildTenantSitemapXml(openApiTenant, context);

    expect(llms).toContain("Sitemap: https://blode.md/example/sitemap.xml");
    expect(llms).toContain(
      "[List projects](https://blode.md/example/api/get-projects.md)"
    );
    expect(robots).toContain("Sitemap: https://blode.md/example/sitemap.xml");
    expect(robots).toContain(
      "Content-Signal: ai-train=no, search=yes, ai-input=yes"
    );
    expect(robots).toContain("# https://blode.md/example/llms.txt");
    expect(sitemap).toContain(
      "<loc>https://blode.md/example/api/get-projects</loc>"
    );
  });

  it("preserves custom-domain docs path prefixes in static helper URLs", async () => {
    const prefixedTenant = {
      ...tenant,
      customDomains: ["donebear.com"],
      docsPath: openApiTenant.docsPath,
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
      "[List projects](https://donebear.com/docs/api/get-projects.md)"
    );
    expect(robots).toContain("Sitemap: https://donebear.com/docs/sitemap.xml");
    expect(robots).toContain(
      "Content-Signal: ai-train=no, search=yes, ai-input=yes"
    );
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

describe("sanitizePlaceholderUrls", () => {
  it("strips markdown link wrapping for placeholder URLs", () => {
    const input = "See [Changelog](https://example.com/changelog) for details.";
    const output = sanitizePlaceholderUrls(input);
    expect(output).toBe("See Changelog for details.");
    expect(output).not.toContain("](https://example.com");
  });

  it("wraps bare placeholder URLs in backticks", () => {
    const input = "Call https://api.example.com/users to fetch users.";
    const output = sanitizePlaceholderUrls(input);
    expect(output).toBe("Call `https://api.example.com/users` to fetch users.");
  });

  it("handles discord.gg/example placeholder URLs", () => {
    const linkInput = "Join [our community](https://discord.gg/example) today.";
    const bareInput = "Visit https://discord.gg/example for help.";

    expect(sanitizePlaceholderUrls(linkInput)).toBe(
      "Join our community today."
    );
    expect(sanitizePlaceholderUrls(bareInput)).toBe(
      "Visit `https://discord.gg/example` for help."
    );
  });

  it("leaves non-placeholder URLs untouched", () => {
    const input = "See [Docs](https://blode.md/docs) and https://blode.md/llm.";
    expect(sanitizePlaceholderUrls(input)).toBe(input);
  });

  it("strips reserved-TLD placeholder URLs", () => {
    const linkInput = "Hit [API](https://api.your-domain.test) for data.";
    const bareInput = "Try https://staging.acme.invalid/path next.";

    expect(sanitizePlaceholderUrls(linkInput)).toBe("Hit API for data.");
    expect(sanitizePlaceholderUrls(bareInput)).toBe(
      "Try `https://staging.acme.invalid/path` next."
    );
  });

  it("strips localhost placeholder URLs", () => {
    expect(
      sanitizePlaceholderUrls("Run http://localhost:3030/health to check.")
    ).toBe("Run `http://localhost:3030/health` to check.");
  });

  it("strips yourdomain placeholder URLs", () => {
    expect(
      sanitizePlaceholderUrls(
        "Visit [the site](https://www.yourdomain.com/docs) to begin."
      )
    ).toBe("Visit the site to begin.");
    expect(
      sanitizePlaceholderUrls(
        "After deploying, hit https://yourdomain.com/docs ok."
      )
    ).toBe("After deploying, hit `https://yourdomain.com/docs` ok.");
  });

  it("strips acme.blode.md placeholder URLs", () => {
    expect(
      sanitizePlaceholderUrls('const TARGET = "https://acme.blode.md";')
    ).toBe('const TARGET = "`https://acme.blode.md`";');
  });

  it("strips github.com/example placeholder URLs", () => {
    expect(
      sanitizePlaceholderUrls('"href": "https://github.com/example/docs/repo"')
    ).toBe('"href": "`https://github.com/example/docs/repo`"');
  });
});

describe("absolutiseInternalLinks", () => {
  it("rewrites root-relative markdown links with the origin", () => {
    const input = "See [Navigation](/configuration/navigation) for more.";
    expect(absolutiseInternalLinks(input, "https://docs.example.com", "")).toBe(
      "See [Navigation](https://docs.example.com/configuration/navigation) for more."
    );
  });

  it("prefixes links with the tenant base path when set", () => {
    const input = "See [Navigation](/configuration/navigation).";
    expect(
      absolutiseInternalLinks(input, "https://yourdomain.com", "/docs")
    ).toBe(
      "See [Navigation](https://yourdomain.com/docs/configuration/navigation)."
    );
  });

  it("does not double-prefix paths that already include the base path", () => {
    const input = "See [Navigation](/docs/configuration/navigation).";
    expect(
      absolutiseInternalLinks(input, "https://yourdomain.com", "/docs")
    ).toBe(
      "See [Navigation](https://yourdomain.com/docs/configuration/navigation)."
    );
  });

  it("leaves absolute http(s) links alone", () => {
    const input = "Visit [GitHub](https://github.com/mblode/blodemd).";
    expect(absolutiseInternalLinks(input, "https://docs.example.com", "")).toBe(
      input
    );
  });
});

describe("buildTenantLlmsFullTxt placeholder sanitization", () => {
  it("removes placeholder URLs from concatenated MDX output", async () => {
    const docsPath = await createTempUtilityRoot({
      "docs.json": JSON.stringify(
        {
          $schema: "https://blode.md/docs.json",
          name: "Example Docs",
          navigation: {
            groups: [{ group: "Docs", pages: ["placeholders"] }],
          },
        },
        null,
        2
      ),
      "placeholders.mdx":
        "---\ntitle: Placeholders\n---\n\nSee [Changelog](https://example.com/changelog) and call https://api.example.com/users for data.\n",
    });
    const runtimeTenant = {
      ...tenant,
      customDomains: [],
      docsPath,
      primaryDomain: "example.blode.md",
    };

    const output = await buildTenantLlmsFullTxt(runtimeTenant);

    expect(output).not.toContain("](https://example.com/changelog)");
    expect(output).toContain("See Changelog and call");
    expect(output).toContain("`https://api.example.com/users`");
  });

  it("rewrites root-relative internal links to absolute URLs", async () => {
    const docsPath = await createTempUtilityRoot({
      "docs.json": JSON.stringify(
        {
          $schema: "https://blode.md/docs.json",
          name: "Example Docs",
          navigation: {
            groups: [{ group: "Docs", pages: ["intro"] }],
          },
        },
        null,
        2
      ),
      "intro.mdx":
        "---\ntitle: Intro\n---\n\nSee [Navigation](/configuration/navigation) for setup.\n",
    });
    const runtimeTenant = {
      ...tenant,
      customDomains: [],
      docsPath,
      primaryDomain: "example.blode.md",
    };

    const output = await buildTenantLlmsFullTxt(runtimeTenant);

    expect(output).toContain(
      "[Navigation](https://example.blode.md/configuration/navigation)"
    );
    expect(output).not.toContain("[Navigation](/configuration/navigation)");
  });
});
