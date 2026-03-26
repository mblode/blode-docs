import { randomUUID } from "node:crypto";

import type * as RepoDb from "@repo/db";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type DbModule = typeof RepoDb;

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/neue_docs_drizzle_test";
process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = "test";
process.env.PLATFORM_ROOT_DOMAIN = "blode.md";

let app: FastifyInstance;
let dbModule: DbModule;

beforeAll(async () => {
  const apiModule = await import("./index.js");
  ({ app } = apiModule);
  dbModule = await import("@repo/db");
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("tenants resolve", () => {
  it("resolves a subdomain to a tenant", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;

    const [project] = await dbModule.db
      .insert(dbModule.projects)
      .values({
        deploymentName: projectSlug,
        description: "Test project",
        name: projectSlug,
        slug: projectSlug,
      })
      .returning({ id: dbModule.projects.id });

    if (!project) {
      throw new Error("Failed to create test project.");
    }

    const response = await app.inject({
      method: "GET",
      url: `/tenants/resolve?host=${projectSlug}.blode.md&path=/`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.tenant.slug).toBe(projectSlug);
    expect(body.strategy).toBe("subdomain");

    await new dbModule.ProjectDao().delete(project.id);
  });

  it("resolves a custom domain with a path prefix", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const customDomain = `custom-${randomUUID().slice(0, 8)}.com`;

    const [project] = await dbModule.db
      .insert(dbModule.projects)
      .values({
        deploymentName: projectSlug,
        name: projectSlug,
        slug: projectSlug,
      })
      .returning({ id: dbModule.projects.id });

    if (!project) {
      throw new Error("Failed to create test project.");
    }

    await dbModule.db.insert(dbModule.domains).values({
      hostname: customDomain,
      pathPrefix: "/docs",
      projectId: project.id,
    });

    const response = await app.inject({
      method: "GET",
      url: `/tenants/resolve?host=${customDomain}&path=/docs/getting-started`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.strategy).toBe("custom-domain");
    expect(body.basePath).toBe("/docs");

    await new dbModule.ProjectDao().delete(project.id);
  });
});
