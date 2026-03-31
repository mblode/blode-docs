import { describe, expect, it } from "vitest";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@127.0.0.1:54322/blode_docs_drizzle_test";
process.env.PLATFORM_ROOT_DOMAIN ??= "blode.md";

describe("buildTenantPrewarmUrls", () => {
  it("builds canonical urls for tenant docs and utility routes", async () => {
    const { buildTenantPrewarmUrls } = await import("./prewarm");

    expect(
      buildTenantPrewarmUrls({
        pageSlugs: ["index", "guides/intro", "search"],
        primaryDomain: "docs.example.com",
      })
    ).toEqual([
      "https://docs.example.com/",
      "https://docs.example.com/llms-full.txt",
      "https://docs.example.com/llms.txt",
      "https://docs.example.com/robots.txt",
      "https://docs.example.com/search",
      "https://docs.example.com/sitemap.xml",
      "https://docs.example.com/guides/intro",
    ]);
  });

  it("prefixes urls when a custom domain uses a path prefix", async () => {
    const { buildTenantPrewarmUrls } = await import("./prewarm");

    expect(
      buildTenantPrewarmUrls({
        pageSlugs: ["index", "api/get-projects"],
        pathPrefix: "/docs",
        primaryDomain: "donebear.com",
      })
    ).toEqual([
      "https://donebear.com/docs",
      "https://donebear.com/docs/llms-full.txt",
      "https://donebear.com/docs/llms.txt",
      "https://donebear.com/docs/robots.txt",
      "https://donebear.com/docs/search",
      "https://donebear.com/docs/sitemap.xml",
      "https://donebear.com/docs/api/get-projects",
    ]);
  });
});
