import { describe, expect, it } from "vitest";

import { ProjectUpdateSchema } from "./project.js";

describe("ProjectUpdateSchema", () => {
  it("allows clearing an existing description", () => {
    expect(ProjectUpdateSchema.parse({ description: null })).toEqual({
      description: null,
    });
  });

  it("accepts an analytics payload with both providers", () => {
    expect(
      ProjectUpdateSchema.parse({
        analytics: {
          ga4: { measurementId: "G-ABC123DEFG" },
          posthog: { projectKey: "phc_abcdefghijklmnopqrstuvwxyz" },
        },
      })
    ).toEqual({
      analytics: {
        ga4: { measurementId: "G-ABC123DEFG" },
        posthog: { projectKey: "phc_abcdefghijklmnopqrstuvwxyz" },
      },
    });
  });

  it("allows clearing analytics with null", () => {
    expect(ProjectUpdateSchema.parse({ analytics: null })).toEqual({
      analytics: null,
    });
  });

  it("rejects invalid measurement IDs", () => {
    expect(() =>
      ProjectUpdateSchema.parse({
        analytics: { ga4: { measurementId: "not-a-ga4-id" } },
      })
    ).toThrow();
  });
});
