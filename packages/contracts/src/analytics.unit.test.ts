import { describe, expect, it } from "vitest";

import {
  ProjectAnalyticsGa4Schema,
  ProjectAnalyticsPosthogSchema,
  ProjectAnalyticsSchema,
} from "./analytics.js";

describe("ProjectAnalyticsGa4Schema", () => {
  it("accepts a valid measurement ID", () => {
    expect(
      ProjectAnalyticsGa4Schema.parse({ measurementId: "G-ABC123DEFG" })
    ).toEqual({ measurementId: "G-ABC123DEFG" });
  });

  it("rejects lowercase measurement IDs", () => {
    expect(() =>
      ProjectAnalyticsGa4Schema.parse({ measurementId: "g-abc123" })
    ).toThrow();
  });

  it("rejects legacy UA-style IDs", () => {
    expect(() =>
      ProjectAnalyticsGa4Schema.parse({ measurementId: "UA-12345-1" })
    ).toThrow();
  });
});

describe("ProjectAnalyticsPosthogSchema", () => {
  it("accepts a phc_ project key", () => {
    expect(
      ProjectAnalyticsPosthogSchema.parse({
        projectKey: "phc_abcdefghijklmnopqrstuvwxyz",
      })
    ).toEqual({ projectKey: "phc_abcdefghijklmnopqrstuvwxyz" });
  });

  it("rejects phx_ personal API keys", () => {
    expect(() =>
      ProjectAnalyticsPosthogSchema.parse({
        projectKey: "phx_abcdefghijklmnopqrstuvwxyz",
      })
    ).toThrow();
  });

  it("accepts an optional host", () => {
    expect(
      ProjectAnalyticsPosthogSchema.parse({
        host: "https://eu.i.posthog.com",
        projectKey: "phc_abcdefghijklmnopqrstuvwxyz",
      })
    ).toEqual({
      host: "https://eu.i.posthog.com",
      projectKey: "phc_abcdefghijklmnopqrstuvwxyz",
    });
  });

  it("rejects a non-URL host", () => {
    expect(() =>
      ProjectAnalyticsPosthogSchema.parse({
        host: "not-a-url",
        projectKey: "phc_abcdefghijklmnopqrstuvwxyz",
      })
    ).toThrow();
  });
});

describe("ProjectAnalyticsSchema", () => {
  it("allows both providers together", () => {
    expect(
      ProjectAnalyticsSchema.parse({
        ga4: { measurementId: "G-ABC123DEFG" },
        posthog: { projectKey: "phc_abcdefghijklmnopqrstuvwxyz" },
      })
    ).toEqual({
      ga4: { measurementId: "G-ABC123DEFG" },
      posthog: { projectKey: "phc_abcdefghijklmnopqrstuvwxyz" },
    });
  });

  it("allows an empty config (both providers cleared)", () => {
    expect(ProjectAnalyticsSchema.parse({})).toEqual({});
  });
});
