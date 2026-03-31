import { describe, expect, it } from "vitest";

import { getRequestHost, isReservedPath, isRootRuntimeHost } from "./tenancy";
import {
  getCanonicalDocBasePath,
  getCanonicalOrigin,
  getTenantRequestContextFromHeaders,
} from "./tenant-static";

const tenant = {
  customDomains: ["docs.example.com"],
  id: "tenant-id",
  name: "Example",
  primaryDomain: "docs.example.com",
  slug: "example",
  status: "active" as const,
  subdomain: "example",
};

describe("tenancy helpers", () => {
  it("extracts the forwarded host and normalizes it", () => {
    const headerStore = new Headers({
      host: "example.blode.md:3001",
      "x-forwarded-host": "Docs.Example.com:443",
    });

    expect(getRequestHost(headerStore)).toBe("docs.example.com");
  });

  it("treats internal and root static paths as reserved without blocking docs api routes", () => {
    expect(isReservedPath("/blodemd-internal/proxy")).toBe(true);
    expect(isReservedPath("/robots.txt")).toBe(true);
    expect(isReservedPath("/logos/example-mark-dark.svg")).toBe(true);
    expect(isReservedPath("/oauth/consent")).toBe(true);
    expect(isReservedPath("/api/overview")).toBe(false);
    expect(isReservedPath("/example/sitemap.xml")).toBe(false);
  });

  it("identifies the runtime root hosts", () => {
    expect(isRootRuntimeHost("blode.md")).toBe(true);
    expect(isRootRuntimeHost("localhost")).toBe(true);
    expect(isRootRuntimeHost("example.blode.md")).toBe(false);
    expect(isRootRuntimeHost("example.localhost")).toBe(false);
  });

  it("treats the configured portless host as a runtime root host", () => {
    const previousPortlessUrl = process.env.PORTLESS_URL;
    process.env.PORTLESS_URL = "http://docs.localhost:3001";

    try {
      expect(isRootRuntimeHost("docs.localhost")).toBe(true);
      expect(isRootRuntimeHost("example.localhost")).toBe(false);
    } finally {
      if (previousPortlessUrl === undefined) {
        delete process.env.PORTLESS_URL;
      } else {
        process.env.PORTLESS_URL = previousPortlessUrl;
      }
    }
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

  it("preserves custom-domain docs base paths from tenant headers", () => {
    const prefixedTenant = {
      ...tenant,
      customDomains: ["donebear.com"],
      pathPrefix: "/docs",
      primaryDomain: "donebear.com",
    };
    const headerStore = new Headers({
      "x-forwarded-proto": "https",
      "x-tenant-base-path": "/docs",
      "x-tenant-domain": "donebear.com",
      "x-tenant-strategy": "custom-domain",
    });

    const context = getTenantRequestContextFromHeaders(
      prefixedTenant,
      headerStore
    );

    expect(getCanonicalOrigin(prefixedTenant, context)).toBe(
      "https://donebear.com"
    );
    expect(getCanonicalDocBasePath(prefixedTenant, context)).toBe("/docs");
  });
});
