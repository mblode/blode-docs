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

describe("domains API", () => {
  const adminHeaders = {
    "content-type": "application/json",
    "x-admin-token": "test-admin-token",
  };

  it("normalizes domain input and path prefixes", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const fixture = await createProjectFixture(dbModule, { slug: projectSlug });

    const response = await request(`/projects/${fixture.projectId}/domains`, {
      body: JSON.stringify({
        hostname: "https://docs.example.com/docs",
        pathPrefix: "docs",
      }),
      headers: adminHeaders,
      method: "POST",
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.domain.hostname).toBe("docs.example.com");
    expect(body.domain.pathPrefix).toBe("/docs");
    expect(body.domain.status).toBe("Pending Verification");

    await cleanupProjectFixture(dbModule, fixture);
  });

  it("rejects blode.md as a custom domain", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const fixture = await createProjectFixture(dbModule, { slug: projectSlug });

    const response = await request(`/projects/${fixture.projectId}/domains`, {
      body: JSON.stringify({
        hostname: "blode.md",
      }),
      headers: adminHeaders,
      method: "POST",
    });

    expect(response.status).toBe(400);

    await cleanupProjectFixture(dbModule, fixture);
  });

  it("requires credentials for domain changes", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const fixture = await createProjectFixture(dbModule, { slug: projectSlug });

    const response = await request(`/projects/${fixture.projectId}/domains`, {
      body: JSON.stringify({
        hostname: "docs.example.com",
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(401);

    await cleanupProjectFixture(dbModule, fixture);
  });
});
