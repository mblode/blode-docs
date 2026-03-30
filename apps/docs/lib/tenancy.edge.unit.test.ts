import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { resolveTenantFromEdgeConfig as ResolveTenantFromEdgeConfig } from "./tenancy";

const edgeConfigMocks = vi.hoisted(() => ({
  getTenantEdgeHostRecord: vi.fn(),
  getTenantEdgeSlugRecord: vi.fn(),
}));

vi.mock("./edge-config", () => ({
  getTenantEdgeHostRecord: edgeConfigMocks.getTenantEdgeHostRecord,
  getTenantEdgeSlugRecord: edgeConfigMocks.getTenantEdgeSlugRecord,
}));

let resolveTenantFromEdgeConfig: typeof ResolveTenantFromEdgeConfig;

const tenant = {
  customDomains: ["docs.example.com"],
  id: "tenant-id",
  name: "Atlas",
  pathPrefix: "/docs",
  primaryDomain: "docs.example.com",
  slug: "atlas",
  status: "active" as const,
  subdomain: "atlas",
};

describe("resolveTenantFromEdgeConfig", () => {
  beforeAll(async () => {
    ({ resolveTenantFromEdgeConfig } = await import("./tenancy"));
  });

  beforeEach(() => {
    edgeConfigMocks.getTenantEdgeHostRecord.mockReset();
    edgeConfigMocks.getTenantEdgeSlugRecord.mockReset();
  });

  it("resolves a custom domain host record without the docs API", async () => {
    edgeConfigMocks.getTenantEdgeHostRecord.mockResolvedValue({
      host: "docs.example.com",
      pathPrefix: "/docs",
      strategy: "custom-domain",
      tenant,
      version: 1,
    });

    const resolution = await resolveTenantFromEdgeConfig(
      "docs.example.com",
      "/docs/getting-started"
    );

    expect(resolution).toMatchObject({
      basePath: "/docs",
      host: "docs.example.com",
      rewrittenPath: "/sites/atlas/getting-started",
      strategy: "custom-domain",
    });
  });

  it("resolves a subdomain via the tenant slug record", async () => {
    edgeConfigMocks.getTenantEdgeHostRecord.mockResolvedValue(null);
    edgeConfigMocks.getTenantEdgeSlugRecord.mockResolvedValue({
      slug: "atlas",
      tenant: {
        ...tenant,
        customDomains: [],
        pathPrefix: undefined,
        primaryDomain: "atlas.blode.md",
      },
      version: 1,
    });

    const resolution = await resolveTenantFromEdgeConfig(
      "atlas.blode.md",
      "/docs/cli"
    );

    expect(resolution).toMatchObject({
      basePath: "/docs",
      host: "atlas.blode.md",
      rewrittenPath: "/sites/atlas/cli",
      strategy: "subdomain",
    });
  });

  it("resolves a root-domain path tenant via the tenant slug record", async () => {
    edgeConfigMocks.getTenantEdgeHostRecord.mockResolvedValue(null);
    edgeConfigMocks.getTenantEdgeSlugRecord.mockResolvedValue({
      slug: "atlas",
      tenant: {
        ...tenant,
        customDomains: [],
        pathPrefix: undefined,
        primaryDomain: "atlas.blode.md",
      },
      version: 1,
    });

    const resolution = await resolveTenantFromEdgeConfig(
      "blode.md",
      "/atlas/guides/intro"
    );

    expect(resolution).toMatchObject({
      basePath: "/atlas",
      host: "blode.md",
      rewrittenPath: "/sites/atlas/guides/intro",
      strategy: "path",
    });
  });
});
