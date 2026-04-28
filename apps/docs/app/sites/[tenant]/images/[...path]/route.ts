import { NextResponse } from "next/server";

import { getTenantContentSource } from "@/lib/content-source";
import { getTenantBySlug } from "@/lib/tenants";

export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const revalidate = 3600;

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ tenant: string; path: string[] }> }
) => {
  const { path, tenant: tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentSource = getTenantContentSource(tenant);
  const resolved = await contentSource.resolveUrl?.(`images/${path.join("/")}`);
  if (!resolved) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(resolved, 307);
};

export const HEAD = GET;
