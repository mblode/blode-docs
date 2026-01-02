import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = "test";
process.env.PLATFORM_ROOT_DOMAIN = "neue.com";

let app: FastifyInstance;
let prisma: PrismaClient;

beforeAll(async () => {
  const apiModule = await import("./index.js");
  app = apiModule.app;
  const dbModule = await import("@repo/db");
  prisma = dbModule.prisma;
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe("domains API", () => {
  it("normalizes domain input and path prefixes", async () => {
    const workspaceSlug = `ws-${randomUUID().slice(0, 8)}`;
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const workspace = await prisma.workspace.create({
      data: { slug: workspaceSlug, name: workspaceSlug },
    });

    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        slug: projectSlug,
        name: projectSlug,
        deploymentName: projectSlug,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/domains`,
      payload: {
        hostname: "https://docs.example.com/docs",
        pathPrefix: "docs",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.domain.hostname).toBe("docs.example.com");
    expect(body.domain.pathPrefix).toBe("/docs");
    expect(body.domain.status).toBe("Pending Verification");

    await prisma.workspace.delete({ where: { id: workspace.id } });
  });

  it("rejects neue.com as a custom domain", async () => {
    const workspaceSlug = `ws-${randomUUID().slice(0, 8)}`;
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const workspace = await prisma.workspace.create({
      data: { slug: workspaceSlug, name: workspaceSlug },
    });

    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        slug: projectSlug,
        name: projectSlug,
        deploymentName: projectSlug,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/projects/${project.id}/domains`,
      payload: {
        hostname: "neue.com",
      },
    });

    expect(response.statusCode).toBe(400);

    await prisma.workspace.delete({ where: { id: workspace.id } });
  });
});
