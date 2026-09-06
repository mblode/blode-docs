import { describe, expect, it } from "vitest";

import { buildDocsSeoTitle } from "./seo-title";

describe("buildDocsSeoTitle", () => {
  it("returns baseTitle when pageTitle is missing", () => {
    expect(
      buildDocsSeoTitle({
        baseTitle: "Blode.md",
        pageDescription: "Some description",
      })
    ).toBe("Blode.md");
  });

  it("uses the page title alone and never appends the description", () => {
    expect(
      buildDocsSeoTitle({
        baseTitle: "Blode.md",
        pageDescription:
          "Start a local development server for real-time docs preview with hot reload.",
        pageTitle: "blodemd dev",
      })
    ).toBe("blodemd dev · Blode.md");
  });

  it("clamps a long page title to 60 chars at a word boundary", () => {
    const title = buildDocsSeoTitle({
      baseTitle: "Blode.md",
      pageTitle:
        "A descriptive page title that is already long enough for SERP clipping",
    });

    expect(title.endsWith("... · Blode.md")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.startsWith("A descriptive page title")).toBe(true);
  });

  it("hard-slices when a single token exceeds the budget", () => {
    const title = buildDocsSeoTitle({
      baseTitle: "Blode.md",
      pageTitle: "x".repeat(80),
    });

    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.endsWith("... · Blode.md")).toBe(true);
  });

  it("respects a custom titleTemplate with %s", () => {
    expect(
      buildDocsSeoTitle({
        baseTitle: "Blode.md",
        pageDescription: "Authenticate with GitHub in your browser.",
        pageTitle: "login",
        titleTemplate: "%s | Docs",
      })
    ).toBe("login | Docs");
  });
});
