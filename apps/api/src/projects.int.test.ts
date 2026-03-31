import { randomUUID } from "node:crypto";

import type * as RepoDb from "@repo/db";
import { sql } from "drizzle-orm";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type * as ProjectAuthModule from "./lib/project-auth";

let currentUserId = "";
let createdProjectIds: string[] = [];

interface AuthenticatedUser {
  authId: string;
  createdAt: Date;
  email: string;
  id: string;
  name: string;
  updatedAt: Date;
}

const buildAuthenticatedUser = (): AuthenticatedUser | null => {
  if (!currentUserId) {
    return null;
  }

  return {
    authId: `auth-${currentUserId}`,
    createdAt: new Date(),
    email: `${currentUserId}@example.com`,
    id: currentUserId,
    name: "Test User",
    updatedAt: new Date(),
  };
};

vi.mock("./lib/project-auth", async () => {
  const actual = await vi.importActual<ProjectAuthModule>("./lib/project-auth");

  return {
    ...actual,
    getAuthenticatedUser: vi.fn(() =>
      Promise.resolve(buildAuthenticatedUser())
    ),
  };
});

type DbModule = typeof RepoDb;

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/blode_docs_drizzle_test";
process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = "test";
process.env.PLATFORM_ROOT_DOMAIN = "blode.md\n";
process.env.ADMIN_API_TOKEN = "test-admin-token";
delete process.env.CLOUDFLARE_API_TOKEN;
delete process.env.CLOUDFLARE_ZONE_ID;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.VERCEL_EDGE_CONFIG_ID;
delete process.env.VERCEL_PROJECT_ID;
delete process.env.VERCEL_TEAM_ID;
delete process.env.VERCEL_TEAM_SLUG;
delete process.env.VERCEL_TOKEN;

let request: (input: string, init?: RequestInit) => Promise<Response>;
let dbModule: DbModule;

beforeAll(async () => {
  const apiModule = await import("./index.js");
  request = apiModule.app.request.bind(apiModule.app);
  dbModule = await import("@repo/db");
});

beforeEach(async () => {
  currentUserId = randomUUID();
  createdProjectIds = [];
  await dbModule.db.execute(sql`
    insert into "users" (
      "id",
      "auth_id",
      "email",
      "name"
    )
    values (
      ${currentUserId},
      ${`auth-${currentUserId}`},
      ${`${currentUserId}@example.com`},
      ${"Test User"}
    )
  `);
});

afterEach(async () => {
  for (const projectId of createdProjectIds) {
    await dbModule.db.execute(sql`
      delete from "projects"
      where "id" = ${projectId}
    `);
  }

  if (currentUserId) {
    await dbModule.db.execute(sql`
      delete from "users"
      where "id" = ${currentUserId}
    `);
  }

  currentUserId = "";
});

describe("projects API", () => {
  it("creates a project without creating platform-domain records", async () => {
    const slug = `project-${randomUUID().slice(0, 8)}`;

    const response = await request("/projects", {
      body: JSON.stringify({
        name: slug,
        slug,
      }),
      headers: {
        authorization: "Bearer eyJ.fake-token",
        "content-type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.project.slug).toBe(slug);
    createdProjectIds.push(body.project.id);

    const domains = await new dbModule.DomainDao().listByProject(
      body.project.id
    );
    expect(domains).toHaveLength(0);
  });
});
