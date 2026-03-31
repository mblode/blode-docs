import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/blode_docs_drizzle_test";
process.env.NODE_ENV = "test";

let request: (input: string, init?: RequestInit) => Promise<Response>;

beforeAll(async () => {
  const apiModule = await import("./index.js");
  request = apiModule.app.request.bind(apiModule.app);
});

describe("tenants API", () => {
  it("requires admin credentials to list tenants", async () => {
    const response = await request("/tenants");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid credentials.",
    });
  });
});
