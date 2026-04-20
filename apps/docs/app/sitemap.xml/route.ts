import { NextResponse } from "next/server";

import { MARKETING_CANONICAL_PATHS, marketingUrl } from "@/lib/marketing-site";

export const dynamic = "force-static";
export const preferredRegion = "home";
export const revalidate = 3600;

export const GET = () => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = MARKETING_CANONICAL_PATHS.map((path) => {
    const loc = marketingUrl(path);
    const priority = path === "/" ? "1.0" : "0.7";
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join("\n");

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
