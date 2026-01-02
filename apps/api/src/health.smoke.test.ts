import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = "test";

let app: FastifyInstance;

beforeAll(async () => {
  const apiModule = await import("./index.js");
  app = apiModule.app;
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("health", () => {
  it("responds ok", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
  });
});
