import { NextResponse } from "next/server";

import { BLODEMD_SKILL_CONTENT } from "@/lib/agent-skills";

export const dynamic = "force-static";
export const preferredRegion = "home";
export const revalidate = 3600;

export const GET = () =>
  new NextResponse(BLODEMD_SKILL_CONTENT, {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "text/markdown; charset=utf-8",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
