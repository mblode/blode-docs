import {
  getLegacyTenantEdgeHostKey,
  getLegacyTenantEdgeSlugKey,
  getTenantEdgeHostKey,
  getTenantEdgeSlugKey,
} from "@repo/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const edgeConfigClientMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@vercel/edge-config", () => ({
  createClient: vi.fn(() => edgeConfigClientMock),
}));

const tenant = {
  customDomains: ["docs.example.com"],
  id: "22222222-2222-4222-8222-222222222222",
  name: "Example",
  pathPrefix: "/docs",
  primaryDomain: "docs.example.com",
  slug: "example",
  status: "active" as const,
  subdomain: "example",
};

const previousEdgeConfig = process.env.EDGE_CONFIG;

const expectLookupOrder = (calls: string[], expectedKeys: string[]) => {
  expect(calls).toEqual(expectedKeys);
};

describe("edge-config legacy fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    edgeConfigClientMock.get.mockReset();
    process.env.EDGE_CONFIG = "https://example.com/edge-config";
  });

  afterEach(() => {
    if (previousEdgeConfig === undefined) {
      delete process.env.EDGE_CONFIG;
      return;
    }

    process.env.EDGE_CONFIG = previousEdgeConfig;
  });

  it("falls back to legacy host keys when the migrated key is missing", async () => {
    edgeConfigClientMock.get.mockImplementation((key: string) => {
      if (key === "tenant:host:docs.example.com") {
        return {
          host: "docs.example.com",
          pathPrefix: "/docs",
          strategy: "custom-domain",
          tenant,
          version: 1,
        };
      }

      return null;
    });

    const { getTenantEdgeHostRecord } = await import("./edge-config");

    await expect(
      getTenantEdgeHostRecord("docs.example.com")
    ).resolves.toMatchObject({
      host: "docs.example.com",
      strategy: "custom-domain",
    });
    expectLookupOrder(
      edgeConfigClientMock.get.mock.calls.map(([key]) => key),
      [
        getTenantEdgeHostKey("docs.example.com"),
        getLegacyTenantEdgeHostKey("docs.example.com"),
      ]
    );
  });

  it("falls back to legacy slug keys when the migrated key is missing", async () => {
    edgeConfigClientMock.get.mockImplementation((key: string) => {
      if (key === "tenant:slug:example") {
        return {
          slug: "example",
          tenant,
          version: 1,
        };
      }

      return null;
    });

    const { getTenantEdgeSlugRecord } = await import("./edge-config");

    await expect(getTenantEdgeSlugRecord("example")).resolves.toMatchObject({
      slug: "example",
    });
    expectLookupOrder(
      edgeConfigClientMock.get.mock.calls.map(([key]) => key),
      [getTenantEdgeSlugKey("example"), getLegacyTenantEdgeSlugKey("example")]
    );
  });
});
