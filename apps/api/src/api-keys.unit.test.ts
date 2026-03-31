import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type * as DbModule from "./lib/db";
import type * as ProjectAuthModule from "./lib/project-auth";

let authorizeResult = true;
const listByProjectResult = [
  {
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    id: "649a2cb8-52ea-492d-8d76-d6787f1e49b6",
    lastUsedAt: null,
    name: "Default",
    prefix: "ndk_demo",
    projectId: "7c3afcb6-c6e3-4a0a-948a-d8274210c829",
    revokedAt: null,
  },
];
const createdRecord = {
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  id: "9a835f66-4f02-4f8b-9d35-1e405f9b71c6",
  lastUsedAt: null,
  name: "Deploy key",
  prefix: "ndk_created",
  projectId: "7c3afcb6-c6e3-4a0a-948a-d8274210c829",
  revokedAt: null,
};

const listByProject = vi.fn(() => Promise.resolve(listByProjectResult));
const create = vi.fn(() => Promise.resolve(createdRecord));

vi.mock("./lib/project-auth", async () => {
  const actual = await vi.importActual<ProjectAuthModule>("./lib/project-auth");

  return {
    ...actual,
    authorizeProjectRequest: vi.fn(() => Promise.resolve(authorizeResult)),
  };
});

vi.mock("./lib/db", async () => {
  const actual = await vi.importActual<DbModule>("./lib/db");

  return {
    ...actual,
    apiKeyDao: {
      create,
      listByProject,
    },
  };
});

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/blode_docs_drizzle_test";
process.env.NODE_ENV = "test";

let request: (input: string, init?: RequestInit) => Promise<Response>;

beforeAll(async () => {
  const apiModule = await import("./index.js");
  request = apiModule.app.request.bind(apiModule.app);
});

beforeEach(() => {
  authorizeResult = true;
  listByProject.mockClear();
  create.mockClear();
});

describe("api keys API", () => {
  it("requires authorization to list keys", async () => {
    authorizeResult = false;

    const response = await request(
      "/projects/7c3afcb6-c6e3-4a0a-948a-d8274210c829/api-keys"
    );

    expect(response.status).toBe(401);
  });

  it("lists project API keys", async () => {
    const response = await request(
      "/projects/7c3afcb6-c6e3-4a0a-948a-d8274210c829/api-keys"
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      {
        name: "Default",
        prefix: "ndk_demo",
      },
    ]);
  });

  it("creates a new API key", async () => {
    const response = await request(
      "/projects/7c3afcb6-c6e3-4a0a-948a-d8274210c829/api-keys",
      {
        body: JSON.stringify({ name: "Deploy key" }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      apiKey: {
        name: "Deploy key",
        prefix: "ndk_created",
      },
      token: expect.stringMatching(/^ndk_[a-f0-9]{8}\.[a-f0-9]{48}$/),
    });
  });
});
