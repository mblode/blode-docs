import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type * as DbModule from "./lib/db";
import type * as EdgeConfigModule from "./lib/edge-config";
import type * as ProjectAuthModule from "./lib/project-auth";
import type * as VercelModule from "./lib/vercel";

const authorizeProjectRequest = vi.fn();
const getById = vi.fn();
const deleteById = vi.fn();
const syncProjectTenantEdgeConfig = vi.fn();
const deleteDomain = vi.fn();
const removeProjectDomain = vi.fn();

vi.mock("./lib/project-auth", async () => {
  const actual = await vi.importActual<ProjectAuthModule>("./lib/project-auth");

  return {
    ...actual,
    authorizeProjectRequest,
  };
});

vi.mock("./lib/db", async () => {
  const actual = await vi.importActual<DbModule>("./lib/db");

  return {
    ...actual,
    domainDao: {
      ...actual.domainDao,
      delete: deleteById,
      getById,
    },
  };
});

vi.mock("./lib/edge-config", async () => {
  const actual = await vi.importActual<EdgeConfigModule>("./lib/edge-config");

  return {
    ...actual,
    syncProjectTenantEdgeConfig,
  };
});

vi.mock("./lib/vercel", async () => {
  const actual = await vi.importActual<VercelModule>("./lib/vercel");

  return {
    ...actual,
    deleteDomain,
    isVercelEnabled: vi.fn(() => true),
    removeProjectDomain,
  };
});

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/blode_docs_drizzle_test";
process.env.NODE_ENV = "test";

let request: (input: string, init?: RequestInit) => Promise<Response>;

const currentDomain = {
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  hostname: "docs.example.com",
  id: "c88f7daa-1d96-4f08-87de-e21ec3f0e2d5",
  pathPrefix: null,
  projectId: "7c3afcb6-c6e3-4a0a-948a-d8274210c829",
  status: "Valid Configuration",
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  verifiedAt: new Date("2024-01-01T00:00:00.000Z"),
};

beforeAll(async () => {
  const { Hono } = await import("hono");
  const { domains } = await import("./routes/domains.js");
  const app = new Hono();
  app.route("/projects", domains);
  request = app.request.bind(app);
});

beforeEach(() => {
  authorizeProjectRequest.mockReset();
  getById.mockReset();
  deleteById.mockReset();
  syncProjectTenantEdgeConfig.mockReset();
  deleteDomain.mockReset();
  removeProjectDomain.mockReset();

  authorizeProjectRequest.mockResolvedValue(true);
  getById.mockResolvedValue(currentDomain);
  deleteById.mockResolvedValue(currentDomain);
  syncProjectTenantEdgeConfig.mockResolvedValue();
  deleteDomain.mockResolvedValue();
  removeProjectDomain.mockResolvedValue();
});

describe("domains API", () => {
  it("deletes a hosted domain without requiring a redirect companion", async () => {
    const response = await request(
      `/projects/${currentDomain.projectId}/domains/${currentDomain.id}`,
      { method: "DELETE" }
    );

    expect(response.status).toBe(204);
    expect(removeProjectDomain).toHaveBeenCalledTimes(1);
    expect(removeProjectDomain).toHaveBeenCalledWith(
      currentDomain.hostname,
      true
    );
    expect(deleteDomain).toHaveBeenCalledTimes(1);
    expect(deleteDomain).toHaveBeenCalledWith(currentDomain.hostname);
    expect(syncProjectTenantEdgeConfig).toHaveBeenCalledWith(
      currentDomain.projectId,
      {
        removedHosts: [currentDomain.hostname],
      }
    );
  });
});
