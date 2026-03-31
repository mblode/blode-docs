import { randomUUID } from "node:crypto";

import type * as RepoDb from "@repo/db";
import { beforeAll, describe, expect, it } from "vitest";

import { cleanupProjectFixture, createProjectFixture } from "./test-helpers";

type DbModule = typeof RepoDb;

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/blode_docs_drizzle_test";
process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = "test";
process.env.PLATFORM_ROOT_DOMAIN = "blode.md\n";
process.env.ADMIN_API_TOKEN = "test-admin-token";
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

let request: (input: string, init?: RequestInit) => Promise<Response>;
let dbModule: DbModule;

beforeAll(async () => {
  const apiModule = await import("./index.js");
  request = apiModule.app.request.bind(apiModule.app);
  dbModule = await import("@repo/db");
});

describe("tenants resolve", () => {
  it("resolves a subdomain to a tenant", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const fixture = await createProjectFixture(dbModule, {
      description: "Test project",
      slug: projectSlug,
    });

    const response = await request(
      `/tenants/resolve?host=${projectSlug}.blode.md&path=/`
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tenant.slug).toBe(projectSlug);
    expect(body.strategy).toBe("subdomain");

    await cleanupProjectFixture(dbModule, fixture);
  });

  it("resolves a subdomain docs base path without treating docs as a slug", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const fixture = await createProjectFixture(dbModule, { slug: projectSlug });

    const response = await request(
      `/tenants/resolve?host=${projectSlug}.blode.md&path=/docs/skills`
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.strategy).toBe("subdomain");
    expect(body.basePath).toBe("/docs");
    expect(body.rewrittenPath).toBe(`/sites/${projectSlug}/skills`);

    await cleanupProjectFixture(dbModule, fixture);
  });

  it("resolves a custom domain with a path prefix", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const customDomain = `custom-${randomUUID().slice(0, 8)}.com`;
    const fixture = await createProjectFixture(dbModule, { slug: projectSlug });

    await dbModule.db.insert(dbModule.domains).values({
      hostname: customDomain,
      pathPrefix: "/docs",
      projectId: fixture.projectId,
      status: "valid_configuration",
    });

    const response = await request(
      `/tenants/resolve?host=${customDomain}&path=/docs/getting-started`
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.strategy).toBe("custom-domain");
    expect(body.basePath).toBe("/docs");

    await cleanupProjectFixture(dbModule, fixture);
  });

  it("does not resolve a prefixed custom domain when the prefix is missing", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const customDomain = `custom-${randomUUID().slice(0, 8)}.com`;
    const fixture = await createProjectFixture(dbModule, { slug: projectSlug });

    await dbModule.db.insert(dbModule.domains).values({
      hostname: customDomain,
      pathPrefix: "/docs",
      projectId: fixture.projectId,
      status: "valid_configuration",
    });

    const response = await request(
      `/tenants/resolve?host=${customDomain}&path=/getting-started`
    );

    expect(response.status).toBe(404);

    await cleanupProjectFixture(dbModule, fixture);
  });

  it("does not resolve an unverified custom domain", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const customDomain = `pending-${randomUUID().slice(0, 8)}.com`;
    const fixture = await createProjectFixture(dbModule, { slug: projectSlug });

    await dbModule.db.insert(dbModule.domains).values({
      hostname: customDomain,
      pathPrefix: "/docs",
      projectId: fixture.projectId,
      status: "pending_verification",
    });

    const response = await request(
      `/tenants/resolve?host=${customDomain}&path=/docs/getting-started`
    );

    expect(response.status).toBe(404);

    await cleanupProjectFixture(dbModule, fixture);
  });

  it("resolves a path-based tenant on the root domain", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const fixture = await createProjectFixture(dbModule, { slug: projectSlug });

    const response = await request(
      `/tenants/resolve?host=blode.md&path=/${projectSlug}/guides/intro`
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.strategy).toBe("path");
    expect(body.rewrittenPath).toBe(`/sites/${projectSlug}/guides/intro`);

    await cleanupProjectFixture(dbModule, fixture);
  });

  it("resolves a path-based tenant on docs.localhost in local dev", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const fixture = await createProjectFixture(dbModule, { slug: projectSlug });

    const response = await request(
      `/tenants/resolve?host=docs.localhost&path=/${projectSlug}/guides/intro`
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.strategy).toBe("path");
    expect(body.rewrittenPath).toBe(`/sites/${projectSlug}/guides/intro`);

    await cleanupProjectFixture(dbModule, fixture);
  });
});
