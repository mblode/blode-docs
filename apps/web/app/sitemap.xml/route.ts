import { NextResponse } from "next/server";

import { blogPosts } from "@/lib/blog";
import { educationalResources } from "@/lib/educational-resources";
import {
  CANONICAL_PAGES,
  CANONICAL_PATHS,
  marketingUrl,
} from "@/lib/marketing-site";

export const GET = () => {
  const canonicalSet = new Set<string>(CANONICAL_PATHS);
  const entries = [
    ...CANONICAL_PATHS.map((path) => ({
      lastmod: CANONICAL_PAGES[path],
      path,
    })),
    ...blogPosts.map((post) => ({
      lastmod: post.date,
      path: `/blog/${post.slug}`,
    })),
    ...educationalResources
      .filter((resource) => !canonicalSet.has(resource.path))
      .map((resource) => ({
        lastmod: resource.updatedAt,
        path: resource.path,
      })),
  ];

  // No `changefreq` or `priority`: Google ignores both.
  const urls = entries
    .map(
      ({ lastmod, path }) => `  <url>
    <loc>${marketingUrl(path)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new NextResponse(xml, {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/xml; charset=utf-8",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
