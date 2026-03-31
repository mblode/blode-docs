import { afterEach, describe, expect, it } from "vitest";

import { getAllowedCorsOrigins, resolveCorsOrigin } from "./cors";

const originalDocsAppUrl = process.env.DOCS_APP_URL;
const originalCorsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS;
const originalPortlessUrl = process.env.PORTLESS_URL;

afterEach(() => {
  if (originalDocsAppUrl === undefined) {
    delete process.env.DOCS_APP_URL;
  } else {
    process.env.DOCS_APP_URL = originalDocsAppUrl;
  }

  if (originalCorsAllowedOrigins === undefined) {
    delete process.env.CORS_ALLOWED_ORIGINS;
  } else {
    process.env.CORS_ALLOWED_ORIGINS = originalCorsAllowedOrigins;
  }

  if (originalPortlessUrl === undefined) {
    delete process.env.PORTLESS_URL;
  } else {
    process.env.PORTLESS_URL = originalPortlessUrl;
  }
});

describe("cors helpers", () => {
  it("includes configured and local origins", () => {
    process.env.DOCS_APP_URL = "https://docs.blode.md";
    process.env.CORS_ALLOWED_ORIGINS =
      "https://console.example.com http://localhost:4321";
    process.env.PORTLESS_URL = "http://docs.localhost:3001";

    expect(getAllowedCorsOrigins()).toEqual(
      expect.arrayContaining([
        "https://docs.blode.md",
        "https://console.example.com",
        "http://localhost:4321",
        "http://docs.localhost:3001",
      ])
    );
  });

  it("only resolves allowlisted origins", () => {
    process.env.CORS_ALLOWED_ORIGINS = "https://console.example.com";

    expect(resolveCorsOrigin("https://console.example.com")).toBe(
      "https://console.example.com"
    );
    expect(resolveCorsOrigin("https://evil.example.com")).toBeNull();
  });
});
