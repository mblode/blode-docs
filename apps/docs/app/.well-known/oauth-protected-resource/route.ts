import { NextResponse } from "next/server";

import { MARKETING_ORIGIN, marketingUrl } from "@/lib/marketing-site";

export const dynamic = "force-static";
export const preferredRegion = "home";
export const revalidate = 3600;

const metadata = {
  authorization_servers: [MARKETING_ORIGIN],
  bearer_methods_supported: ["header"],
  resource: marketingUrl("/api"),
  resource_documentation: marketingUrl("/docs/api/overview"),
  scopes_supported: [
    "projects:read",
    "projects:write",
    "deployments:read",
    "deployments:write",
    "domains:read",
    "domains:write",
  ],
};

export const GET = () =>
  new NextResponse(JSON.stringify(metadata, null, 2), {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/json; charset=utf-8",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
