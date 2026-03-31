import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  buildTenantSitemapXml,
  getStaticTenantRequestContext,
} from "@/lib/tenant-static";
import { getTenantRequestContextFromUrl } from "@/lib/tenant-utility-context";
import { getTenantBySlug } from "@/lib/tenants";

export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const revalidate = 3600;

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) => {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return new NextResponse("Not found", { status: 404 });
  }

  const xml = await buildTenantSitemapXml(
    tenant,
    getTenantRequestContextFromUrl(new URL(request.url)) ??
      getStaticTenantRequestContext(tenant)
  );

  return new NextResponse(xml, {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "content-type": "application/xml",
    },
  });
};
