import { beforeEach, describe, expect, it, vi } from "vitest";

const edgeConfigMocks = vi.hoisted(() => ({
  getTenantEdgeHostRecord: vi.fn(),
  getTenantEdgeSlugRecord: vi.fn(),
  isEdgeConfigEnabled: vi.fn(),
}));

vi.mock("./edge-config", () => ({
  getTenantEdgeHostRecord: edgeConfigMocks.getTenantEdgeHostRecord,
  getTenantEdgeSlugRecord: edgeConfigMocks.getTenantEdgeSlugRecord,
  isEdgeConfigEnabled: edgeConfigMocks.isEdgeConfigEnabled,
}));

describe("resolveTenant", () => {
  beforeEach(() => {
    edgeConfigMocks.getTenantEdgeHostRecord.mockReset();
    edgeConfigMocks.getTenantEdgeSlugRecord.mockReset();
    edgeConfigMocks.isEdgeConfigEnabled.mockReset();
    vi.restoreAllMocks();
  });

  it("does not fall back to the docs API when Edge Config is enabled", async () => {
    edgeConfigMocks.isEdgeConfigEnabled.mockReturnValue(true);
    edgeConfigMocks.getTenantEdgeHostRecord.mockResolvedValue(null);
    edgeConfigMocks.getTenantEdgeSlugRecord.mockResolvedValue(null);

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { clearTenantResolutionCache, resolveTenant } =
      await import("./tenancy");

    clearTenantResolutionCache();

    await expect(
      resolveTenant("missing.blode.md", "/docs")
    ).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the docs API when Edge Config is disabled", async () => {
    edgeConfigMocks.isEdgeConfigEnabled.mockReturnValue(false);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          basePath: "/docs",
          host: "example.blode.md",
          rewrittenPath: "/sites/example/",
          strategy: "subdomain",
          tenant: {
            customDomains: [],
            id: "11111111-1111-4111-8111-111111111111",
            name: "Example",
            primaryDomain: "example.blode.md",
            slug: "example",
            status: "active",
            subdomain: "example",
          },
        },
        {
          headers: { "content-type": "application/json" },
          status: 200,
        }
      )
    );

    const { clearTenantResolutionCache, resolveTenant } =
      await import("./tenancy");

    clearTenantResolutionCache();

    await expect(
      resolveTenant("example.blode.md", "/docs")
    ).resolves.toMatchObject({
      strategy: "subdomain",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
