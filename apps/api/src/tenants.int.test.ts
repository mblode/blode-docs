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
  const apiModule = await import("./index");
  app = apiModule.app;
  const dbModule = await import("@repo/db");
  prisma = dbModule.prisma;
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe("tenants resolve", () => {
  it("resolves a subdomain to a tenant", async () => {
    const workspaceSlug = `ws-${randomUUID().slice(0, 8)}`;
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;

    const workspace = await prisma.workspace.create({
      data: { slug: workspaceSlug, name: workspaceSlug },
    });

    await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        slug: projectSlug,
        name: projectSlug,
        deploymentName: projectSlug,
        description: "Test project",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/tenants/resolve?host=${projectSlug}.neue.com&path=/`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.tenant.slug).toBe(projectSlug);
    expect(body.strategy).toBe("subdomain");

    await prisma.workspace.delete({ where: { id: workspace.id } });
  });

  it("resolves a custom domain with a path prefix", async () => {
    const workspaceSlug = `ws-${randomUUID().slice(0, 8)}`;
    const projectSlug = `project-${randomUUID().slice(0, 8)}`;
    const customDomain = `custom-${randomUUID().slice(0, 8)}.com`;

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

    await prisma.domain.create({
      data: {
        projectId: project.id,
        hostname: customDomain,
        pathPrefix: "/docs",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/tenants/resolve?host=${customDomain}&path=/docs/getting-started`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.strategy).toBe("custom-domain");
    expect(body.basePath).toBe("/docs");

    await prisma.workspace.delete({ where: { id: workspace.id } });
  });
});
