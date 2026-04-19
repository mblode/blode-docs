import { NextResponse } from "next/server";

import {
  BLODEMD_SKILL_CONTENT,
  BLODEMD_SKILL_DESCRIPTION,
  sha256Hex,
} from "@/lib/agent-skills";
import { marketingUrl } from "@/lib/marketing-site";

export const dynamic = "force-static";
export const preferredRegion = "home";
export const revalidate = 3600;

const index = {
  $schema:
    "https://raw.githubusercontent.com/cloudflare/agent-skills-discovery-rfc/main/schema/v0.2.0/agent-skills-index.schema.json",
  skills: [
    {
      description: BLODEMD_SKILL_DESCRIPTION,
      name: "blodemd",
      sha256: sha256Hex(BLODEMD_SKILL_CONTENT),
      type: "skill.md",
      url: marketingUrl("/.well-known/agent-skills/blodemd/SKILL.md"),
    },
  ],
  version: "0.2.0",
};

export const GET = () =>
  new NextResponse(JSON.stringify(index, null, 2), {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/json; charset=utf-8",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
