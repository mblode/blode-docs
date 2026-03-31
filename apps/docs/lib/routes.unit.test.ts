import { describe, expect, it } from "vitest";

import {
  getMarkdownExportSlug,
  getMarkdownExportSourcePath,
  isExternalHref,
  resolveHref,
  toDocHref,
  toMarkdownDocHref,
} from "./routes";

describe("route helpers", () => {
  it("builds tenant-scoped search hrefs", () => {
    expect(toDocHref("search", "/docs")).toBe("/docs/search");
    expect(resolveHref("/search", "/docs")).toBe("/docs/search");
  });

  it("prefixes internal hrefs with the tenant base path", () => {
    expect(resolveHref("/what-is-a-share", "/docs")).toBe(
      "/docs/what-is-a-share"
    );
    expect(resolveHref("concepts/constraints", "/docs")).toBe(
      "/docs/concepts/constraints"
    );
    expect(resolveHref("/", "/docs")).toBe("/docs");
  });

  it("does not duplicate an existing tenant base path", () => {
    expect(resolveHref("/docs/what-is-a-share", "/docs")).toBe(
      "/docs/what-is-a-share"
    );
  });

  it("preserves query strings and hashes on internal hrefs", () => {
    expect(resolveHref("/what-is-a-share?tab=api#examples", "/docs")).toBe(
      "/docs/what-is-a-share?tab=api#examples"
    );
  });

  it("leaves external and in-page hrefs unchanged", () => {
    expect(resolveHref("https://shareful.ai", "/docs")).toBe(
      "https://shareful.ai"
    );
    expect(resolveHref("#overview", "/docs")).toBe("#overview");
    expect(resolveHref("?q=sync", "/docs")).toBe("?q=sync");
    expect(isExternalHref("mailto:test@example.com")).toBe(true);
  });

  it("keeps doc path generation unchanged for slug-based routes", () => {
    expect(toDocHref("what-is-a-share", "/docs")).toBe("/docs/what-is-a-share");
  });

  it("builds markdown export hrefs for root and nested pages", () => {
    expect(toMarkdownDocHref("index")).toBe("/.md");
    expect(toMarkdownDocHref("index", "/docs")).toBe("/docs.md");
    expect(toMarkdownDocHref("cli/usage", "/docs")).toBe("/docs/cli/usage.md");
  });

  it("strips public markdown export extensions from page paths", () => {
    expect(getMarkdownExportSourcePath("/.md")).toBe("/");
    expect(getMarkdownExportSourcePath("/docs/cli/usage.md")).toBe(
      "/docs/cli/usage"
    );
    expect(getMarkdownExportSourcePath("/docs/cli/usage.mdx")).toBe(
      "/docs/cli/usage"
    );
    expect(getMarkdownExportSourcePath("/docs/cli/usage")).toBeNull();
  });

  it("derives tenant-relative markdown slugs from exported page paths", () => {
    expect(getMarkdownExportSlug("/.md")).toBe("");
    expect(getMarkdownExportSlug("/docs.md", "/docs")).toBe("");
    expect(getMarkdownExportSlug("/docs/cli/usage.md", "/docs")).toBe(
      "cli/usage"
    );
    expect(getMarkdownExportSlug("/example.md", "/example")).toBe("");
  });
});
