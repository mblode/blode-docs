import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const preferredRegion = "home";
export const revalidate = 3600;

export const GET = () =>
  new NextResponse(
    `User-agent: *
Allow: /`,
    {
      headers: {
        "CDN-Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": "text/plain",
        "Vercel-CDN-Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
