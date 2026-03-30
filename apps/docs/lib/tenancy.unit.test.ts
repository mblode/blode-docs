import { describe, expect, it } from "vitest";

import { getRequestHost, isReservedPath, isRootRuntimeHost } from "./tenancy";
import {
  getCanonicalOrigin,
  getTenantRequestContextFromHeaders,
} from "./tenant-static";

const tenant = {
  customDomains: ["docs.example.com"],
  id: "tenant-id",
  name: "Atlas",
  primaryDomain: "docs.example.com",
  slug: "atlas",
  status: "active" as const,
  subdomain: "atlas",
};

describe("tenancy helpers", () => {
  it("extracts the forwarded host and normalizes it", () => {
    const headerStore = new Headers({
      host: "atlas.blode.md:3001",
      "x-forwarded-host": "Docs.Example.com:443",
    });

    expect(getRequestHost(headerStore)).toBe("docs.example.com");
  });

  it("treats internal and root static paths as reserved without blocking docs api routes", () => {
    expect(isReservedPath("/blodemd-internal/proxy")).toBe(true);
    expect(isReservedPath("/robots.txt")).toBe(true);
    expect(isReservedPath("/logos/atlas-mark-dark.svg")).toBe(true);
    expect(isReservedPath("/oauth/consent")).toBe(true);
    expect(isReservedPath("/api/overview")).toBe(false);
    expect(isReservedPath("/atlas/sitemap.xml")).toBe(false);
  });

  it("identifies the runtime root hosts", () => {
    expect(isRootRuntimeHost("blode.md")).toBe(true);
    expect(isRootRuntimeHost("localhost")).toBe(true);
    expect(isRootRuntimeHost("atlas.blode.md")).toBe(false);
  });

  it("builds canonical origin from tenant headers", () => {
    const headerStore = new Headers({
      "x-forwarded-proto": "https",
      "x-tenant-base-path": "/docs",
      "x-tenant-domain": "docs.example.com",
      "x-tenant-strategy": "custom-domain",
    });

    const context = getTenantRequestContextFromHeaders(tenant, headerStore);

    expect(getCanonicalOrigin(tenant, context)).toBe(
      "https://docs.example.com"
    );
  });
});
