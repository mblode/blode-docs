import { readFile } from "node:fs/promises";
import path from "node:path";

import { cacheLife } from "next/cache";
import { NextResponse } from "next/server";

import { marketingUrl } from "@/lib/marketing-site";

const SLUGS = [
  "home",
  "about",
  "blog",
  "changelog",
  "compare-mintlify",
  "free-online-llms-txt-resources",
  "pricing",
  "privacy",
  "security",
  "terms",
] as const;

type Slug = (typeof SLUGS)[number];

const ALLOWED = new Set<string>(SLUGS);

/** Slugs whose canonical path is not simply `/${slug}`. */
const CANONICAL_PATH_BY_SLUG: Partial<Record<Slug, string>> = {
  "compare-mintlify": "/compare/mintlify",
  home: "/",
};

export const generateStaticParams = () => SLUGS.map((slug) => ({ slug }));

// The directive cannot go on `GET`, and an uncached disk read is enough to pull
// the whole route out of the prerender. The content ships with the build, so it
// never goes stale between deploys.
const readMarkdown = async (slug: Slug): Promise<string> => {
  "use cache";
  cacheLife("max");
  const file = path.join(
    process.cwd(),
    "app",
    "markdown",
    "content",
    `${slug}.md`
  );
  return await readFile(file, "utf8");
};

export const GET = async (
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await context.params;
  if (!ALLOWED.has(slug)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const body = await readMarkdown(slug as Slug);
  const canonicalPath = CANONICAL_PATH_BY_SLUG[slug as Slug] ?? `/${slug}`;
  return new NextResponse(body, {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "text/markdown; charset=utf-8",
      Link: `<${marketingUrl(canonicalPath)}>; rel="canonical"`,
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
};
