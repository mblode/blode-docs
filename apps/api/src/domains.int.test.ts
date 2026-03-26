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
process.env.PLATFORM_ROOT_DOMAIN = "neue.com";

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

describe("domains API", () => {
  it("normalizes domain input and path prefixes", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;

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

    const response = await app.inject({
      method: "POST",
      payload: {
        hostname: "https://docs.example.com/docs",
        pathPrefix: "docs",
      },
      url: `/projects/${project.id}/domains`,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.domain.hostname).toBe("docs.example.com");
    expect(body.domain.pathPrefix).toBe("/docs");
    expect(body.domain.status).toBe("Pending Verification");

    await new dbModule.ProjectDao().delete(project.id);
  });

  it("rejects neue.com as a custom domain", async () => {
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;

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

    const response = await app.inject({
      method: "POST",
      payload: {
        hostname: "neue.com",
      },
      url: `/projects/${project.id}/domains`,
    });

    expect(response.statusCode).toBe(400);

    await new dbModule.ProjectDao().delete(project.id);
  });
});
