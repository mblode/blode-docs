import { NextResponse } from "next/server";

import schema from "../../../../packages/validation/src/blodemd-docs-schema.json";

export const dynamic = "force-static";
export const preferredRegion = "home";
export const revalidate = 3600;

export const GET = (): NextResponse =>
  new NextResponse(JSON.stringify(schema), {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/schema+json; charset=utf-8",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
