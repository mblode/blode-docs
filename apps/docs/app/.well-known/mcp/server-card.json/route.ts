import { NextResponse } from "next/server";

import { siteConfig } from "@/lib/config";
import { marketingUrl } from "@/lib/marketing-site";

export const dynamic = "force-static";
export const preferredRegion = "home";
export const revalidate = 3600;

const serverCard = {
  $schema:
    "https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/schema/server-card.schema.json",
  capabilities: {
    prompts: { listChanged: false },
    resources: { listChanged: true, subscribe: false },
    tools: { listChanged: true },
  },
  documentation: marketingUrl("/docs/api/overview"),
  serverInfo: {
    description:
      "Blode.md MCP server exposes docs content, site search, and deploy tooling to AI agents.",
    name: "blodemd",
    title: "Blode.md",
    vendor: "Blode.md",
    version: siteConfig.version,
  },
  transport: {
    type: "streamable-http",
    url: marketingUrl("/api/mcp"),
  },
};

export const GET = () =>
  new NextResponse(JSON.stringify(serverCard, null, 2), {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/json; charset=utf-8",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
