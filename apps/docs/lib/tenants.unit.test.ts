import { beforeEach, describe, expect, it, vi } from "vitest";

const edgeConfigMocks = vi.hoisted(() => ({
  getTenantEdgeSlugRecord: vi.fn(),
  isEdgeConfigEnabled: vi.fn(),
}));

vi.mock("./edge-config", () => ({
  getTenantEdgeSlugRecord: edgeConfigMocks.getTenantEdgeSlugRecord,
  isEdgeConfigEnabled: edgeConfigMocks.isEdgeConfigEnabled,
}));

describe("getTenantBySlug", () => {
  beforeEach(() => {
    edgeConfigMocks.getTenantEdgeSlugRecord.mockReset();
    edgeConfigMocks.isEdgeConfigEnabled.mockReset();
    vi.restoreAllMocks();
  });

  it("does not fall back to the docs API when Edge Config is enabled", async () => {
    edgeConfigMocks.isEdgeConfigEnabled.mockReturnValue(true);
    edgeConfigMocks.getTenantEdgeSlugRecord.mockResolvedValue(null);

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { clearTenantCache, getTenantBySlug } = await import("./tenants");

    clearTenantCache();

    await expect(getTenantBySlug("missing")).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the docs API when Edge Config is disabled", async () => {
    edgeConfigMocks.isEdgeConfigEnabled.mockReturnValue(false);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          customDomains: [],
          id: "11111111-1111-4111-8111-111111111111",
          name: "Example",
          primaryDomain: "example.blode.md",
          slug: "example",
          status: "active",
          subdomain: "example",
        },
        {
          headers: { "content-type": "application/json" },
          status: 200,
        }
      )
    );

    const { clearTenantCache, getTenantBySlug } = await import("./tenants");

    clearTenantCache();

    await expect(getTenantBySlug("example")).resolves.toMatchObject({
      slug: "example",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
