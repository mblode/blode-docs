import { describe, expect, it } from "vitest";

import { defaultOgImageUrl } from "./default-og-image";

describe("defaultOgImageUrl", () => {
  it("keeps a bare origin on the static png route", () => {
    expect(defaultOgImageUrl("https://docs.example.com")).toBe(
      "https://docs.example.com/opengraph-image.png"
    );
    expect(defaultOgImageUrl("https://docs.example.com", "")).toBe(
      "https://docs.example.com/opengraph-image.png"
    );
  });

  it("serves the docs app's own card under a zone base path", () => {
    expect(defaultOgImageUrl("https://blode.co", "/allmd/docs")).toBe(
      "https://blode.co/allmd/docs/opengraph-image.png"
    );
  });

  it("tolerates a trailing slash on the base path", () => {
    expect(defaultOgImageUrl("https://blode.co", "/allmd/docs/")).toBe(
      "https://blode.co/allmd/docs/opengraph-image.png"
    );
  });

  it("keeps a root /docs siteUrl on the docs app's static png", () => {
    expect(defaultOgImageUrl("https://example.com", "/docs")).toBe(
      "https://example.com/docs/opengraph-image.png"
    );
    expect(defaultOgImageUrl("https://example.com", "/docs/")).toBe(
      "https://example.com/docs/opengraph-image.png"
    );
  });
});
