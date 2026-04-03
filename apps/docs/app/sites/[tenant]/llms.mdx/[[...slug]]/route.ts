import { NextResponse } from "next/server";

import { getLlmPageText } from "@/lib/tenant-static";
import { getTenantBySlug } from "@/lib/tenants";

export const dynamic = "force-static";
export const preferredRegion = "home";
export const revalidate = 3600;

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ tenant: string; slug?: string[] }> }
) => {
  const { slug = [], tenant: tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return new NextResponse("Not found", { status: 404 });
  }

  const slugKey = slug.join("/") || "index";
  const content = await getLlmPageText(tenant, slugKey);
  if (!content) {
    return new NextResponse("Not found", { status: 404 });
  }

  const basePath = tenant.pathPrefix ? `/${tenant.pathPrefix}` : "";
  const llmsTxtUrl = `https://${tenant.primaryDomain}${basePath}/llms.txt`;
  const blockquote =
    `> ## Documentation Index\n` +
    `> Fetch the complete documentation index at: ${llmsTxtUrl}\n` +
    `> Use this file to discover all available pages before exploring further.\n\n`;

  return new NextResponse(blockquote + content, {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "accept",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
};
