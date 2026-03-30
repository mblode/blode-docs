import { NextResponse } from "next/server";

import {
  buildTenantLlmsTxt,
  getStaticTenantRequestContext,
} from "@/lib/tenant-static";
import { getTenantRequestContextFromUrl } from "@/lib/tenant-utility-context";
import { getTenantBySlug } from "@/lib/tenants";

export const dynamic = "force-static";
export const preferredRegion = "home";
export const revalidate = 3600;

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ tenant: string }> }
) => {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return new NextResponse("Not found", { status: 404 });
  }

  const content = await buildTenantLlmsTxt(
    tenant,
    getTenantRequestContextFromUrl(new URL(request.url)) ??
      getStaticTenantRequestContext(tenant)
  );

  return new NextResponse(content, {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
