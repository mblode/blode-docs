import { describe, expect, it } from "vitest";

import {
  clamp,
  ensureArray,
  getLocalRootHostsFromEnv,
  getPortlessHostFromEnv,
  normalizeHost,
  normalizePath,
  safeJsonParse,
  shouldIgnoreRootDocsFile,
  slugify,
  uniq,
  withLeadingSlash,
  withoutLeadingSlash,
} from "./index";

describe("common utilities", () => {
  it("normalizes paths", () => {
    expect(normalizePath("/docs/guide/")).toBe("docs/guide");
    expect(normalizePath("\\docs\\guide\\")).toBe("docs/guide");
  });

  it("normalizes hosts and reads the configured portless host", () => {
    expect(normalizeHost(" Docs.Example.com:3000 ")).toBe("docs.example.com");
    expect(
      getPortlessHostFromEnv({ PORTLESS_URL: "http://docs.localhost:3001" })
    ).toBe("docs.localhost");
  });

  it("builds local root hosts from the environment", () => {
    expect(getLocalRootHostsFromEnv({})).toEqual(
      new Set(["localhost", "127.0.0.1", "docs.localhost"])
    );
    expect(
      getLocalRootHostsFromEnv({
        PORTLESS_URL: "http://preview.localhost:3001",
      })
    ).toEqual(
      new Set(["localhost", "127.0.0.1", "docs.localhost", "preview.localhost"])
    );
  });

  it("adds and removes leading slashes", () => {
    expect(withLeadingSlash("docs")).toBe("/docs");
    expect(withLeadingSlash("/docs")).toBe("/docs");
    expect(withLeadingSlash("")).toBe("/");
    expect(withoutLeadingSlash("/docs")).toBe("docs");
    expect(withoutLeadingSlash("docs")).toBe("docs");
    expect(withoutLeadingSlash("")).toBe("");
  });

  it("slugifies strings", () => {
    expect(slugify("Hello, blodemd!")).toBe("hello-blodemd");
  });

  it("ignores repo helper files only at the docs root", () => {
    expect(shouldIgnoreRootDocsFile(".gitignore")).toBe(true);
    expect(shouldIgnoreRootDocsFile("README.md")).toBe(true);
    expect(shouldIgnoreRootDocsFile("AGENTS.md")).toBe(true);
    expect(shouldIgnoreRootDocsFile("CLAUDE.md")).toBe(true);
    expect(shouldIgnoreRootDocsFile("LICENSE.md")).toBe(true);
    expect(shouldIgnoreRootDocsFile("guides/README.md")).toBe(false);
    expect(shouldIgnoreRootDocsFile("docs/LICENSE.md")).toBe(false);
  });

  it("normalizes arrays", () => {
    expect(ensureArray()).toEqual([]);
    expect(ensureArray("one")).toEqual(["one"]);
    expect(ensureArray(["one", "two"])).toEqual(["one", "two"]);
  });

  it("deduplicates arrays", () => {
    expect(uniq(["a", "a", "b"])).toEqual(["a", "b"]);
  });

  it("safely parses JSON", () => {
    expect(safeJsonParse<{ ok: boolean }>('{"ok":true}')).toEqual({
      ok: true,
    });
    expect(safeJsonParse("{")).toBeNull();
  });

  it("clamps values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
