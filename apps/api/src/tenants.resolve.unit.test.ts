import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type * as DbModule from "./lib/db";
import type * as TenantBuilderModule from "./lib/tenant-builder";

const getByHostname = vi.fn();
const getBySlugUnique = vi.fn();
const buildTenant = vi.fn();

vi.mock("./lib/db", async () => {
  const actual = await vi.importActual<DbModule>("./lib/db");

  return {
    ...actual,
    domainDao: {
      ...actual.domainDao,
      getByHostname,
    },
    projectDao: {
      ...actual.projectDao,
      getBySlugUnique,
    },
  };
});

vi.mock("./lib/tenant-builder", async () => {
  const actual = await vi.importActual<TenantBuilderModule>(
    "./lib/tenant-builder"
  );

  return {
    ...actual,
    buildTenant,
  };
});

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/blode_docs_drizzle_test";
process.env.NODE_ENV = "test";

let request: (input: string, init?: RequestInit) => Promise<Response>;

const project = {
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  deploymentName: "example",
  description: null,
  id: "7c3afcb6-c6e3-4a0a-948a-d8274210c829",
  name: "Example",
  slug: "example",
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  userId: "27f6a57a-77fd-4600-8c24-e94d0cb3f9d8",
};

beforeAll(async () => {
  const { Hono } = await import("hono");
  const { tenants } = await import("./routes/tenants.js");
  const app = new Hono();
  app.route("/tenants", tenants);
  request = app.request.bind(app);
});

beforeEach(() => {
  getByHostname.mockReset();
  getBySlugUnique.mockReset();
  buildTenant.mockReset();

  getByHostname.mockResolvedValue(null);
  getBySlugUnique.mockImplementation((slug: string) =>
    Promise.resolve(slug === project.slug ? project : null)
  );
  buildTenant.mockResolvedValue({
    customDomains: [],
    id: project.id,
    name: project.name,
    primaryDomain: "example.blode.md",
    slug: project.slug,
    status: "active",
    subdomain: project.slug,
  });
});

describe("tenants resolve API", () => {
  it("does not fall through past a matched custom domain", async () => {
    getByHostname.mockResolvedValue({
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      hostname: "example.localhost",
      id: "d2d7e15e-7861-43fb-aa8c-a7bfbd9c1c46",
      pathPrefix: null,
      projectId: project.id,
      status: "Valid Configuration",
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      verifiedAt: new Date("2024-01-01T00:00:00.000Z"),
    });
    buildTenant.mockResolvedValueOnce(null);

    const response = await request(
      "/tenants/resolve?host=example.localhost&path=/"
    );

    expect(response.status).toBe(404);
  });

  it("resolves a local subdomain when no higher-priority match exists", async () => {
    const response = await request(
      "/tenants/resolve?host=example.localhost&path=/guides/getting-started"
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      basePath: "",
      host: "example.localhost",
      rewrittenPath: "/sites/example/guides/getting-started",
      strategy: "subdomain",
      tenant: {
        id: project.id,
        slug: project.slug,
      },
    });
  });
});
