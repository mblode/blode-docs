import { describe, expect, it } from "vitest";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:54322/blode_docs_drizzle_test";
process.env.PLATFORM_ROOT_DOMAIN ??= "blode.md";

describe("buildTenantEdgeConfigItems", () => {
  it("emits slug and host records plus deletes stale hosts", async () => {
    const {
      buildTenantEdgeConfigItems,
      getTenantEdgeHostKey,
      getTenantEdgeSlugKey,
    } = await import("./edge-config");

    const tenant = {
      activeDeploymentId: "11111111-1111-4111-8111-111111111111",
      activeDeploymentManifestUrl: "https://example.com/manifest.json",
      customDomains: ["docs.example.com"],
      description: "Atlas docs",
      id: "22222222-2222-4222-8222-222222222222",
      name: "Atlas",
      pathPrefix: "/docs",
      primaryDomain: "docs.example.com",
      slug: "atlas",
      status: "active" as const,
      subdomain: "atlas",
    };

    const items = buildTenantEdgeConfigItems({
      domains: [
        {
          hostname: "docs.example.com",
          pathPrefix: "/docs",
          status: "valid_configuration",
        },
        {
          hostname: "pending.example.com",
          pathPrefix: null,
          status: "pending_verification",
        },
      ],
      removedHosts: ["old.example.com"],
      tenant,
    });

    expect(
      items.find((item) => item.key === getTenantEdgeSlugKey("atlas"))
    ).toMatchObject({
      key: getTenantEdgeSlugKey("atlas"),
      operation: "upsert",
    });

    expect(
      items.find((item) => item.key === getTenantEdgeHostKey("atlas.blode.md"))
    ).toMatchObject({
      key: getTenantEdgeHostKey("atlas.blode.md"),
      operation: "upsert",
    });

    expect(
      items.find(
        (item) => item.key === getTenantEdgeHostKey("docs.example.com")
      )
    ).toMatchObject({
      key: getTenantEdgeHostKey("docs.example.com"),
      operation: "upsert",
    });

    expect(
      items.find(
        (item) => item.key === getTenantEdgeHostKey("pending.example.com")
      )
    ).toMatchObject({
      key: getTenantEdgeHostKey("pending.example.com"),
      operation: "delete",
    });

    expect(
      items.find((item) => item.key === getTenantEdgeHostKey("old.example.com"))
    ).toMatchObject({
      key: getTenantEdgeHostKey("old.example.com"),
      operation: "delete",
    });
  });
});
