import { NextResponse } from "next/server";

import { computeETag, handleIfNoneMatch } from "@/lib/etag";
import { getPageJson } from "@/lib/tenant-static";
import { getTenantBySlug } from "@/lib/tenants";

export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const revalidate = 3600;

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ tenant: string; slug: string[] }> }
) => {
  const { tenant: tenantSlug, slug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return new NextResponse("Not found", { status: 404 });
  }

  const slugKey = slug.join("/") || "index";
  const data = await getPageJson(tenant, slugKey);
  if (!data) {
    return new NextResponse("Not found", { status: 404 });
  }

  const content = JSON.stringify(data, null, 2);
  const etag = computeETag(content);
  const notModified = handleIfNoneMatch(request, etag);
  if (notModified) {
    return notModified;
  }

  return new NextResponse(content, {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json; charset=utf-8",
      ETag: etag,
      Vary: "accept",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
