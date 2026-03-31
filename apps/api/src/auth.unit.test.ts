import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type * as ProjectAuthModule from "./lib/project-auth";

let currentUser: {
  authId: string;
  createdAt: Date;
  email: string;
  id: string;
  name: string | null;
  updatedAt: Date;
} | null = null;

vi.mock("./lib/project-auth", async () => {
  const actual = await vi.importActual<ProjectAuthModule>("./lib/project-auth");

  return {
    ...actual,
    getAuthenticatedUser: vi.fn(() => Promise.resolve(currentUser)),
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
  currentUser = null;
});

describe("auth API", () => {
  it("returns 401 when no authenticated user is present", async () => {
    const response = await request("/auth/me");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required.",
    });
  });

  it("returns the mapped user when authenticated", async () => {
    currentUser = {
      authId: "auth-user-1",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      email: "user@example.com",
      id: "7c3afcb6-c6e3-4a0a-948a-d8274210c829",
      name: "Example User",
      updatedAt: new Date("2024-01-02T00:00:00.000Z"),
    };

    const response = await request("/auth/me");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      email: "user@example.com",
      id: "7c3afcb6-c6e3-4a0a-948a-d8274210c829",
      name: "Example User",
    });
  });
});
