import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const preferredRegion = "home";
export const revalidate = 3600;

const body = {
  $schema:
    "https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/schema/server-card.schema.json",
  authentication: { type: "none" },
  name: "blodemd",
  serverCard: "/.well-known/mcp/server-card.json",
  transport: {
    type: "streamable-http",
    url: "/mcp",
  },
  version: "1",
};

export const GET = () =>
  new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/json; charset=utf-8",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
