import { headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildTenantLlmsFullTxt,
  getTenantRequestContextFromHeaders,
} from "@/lib/tenant-static";
import { getTenantBySlug } from "@/lib/tenants";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ tenant: string }> }
) => {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return new NextResponse("Not found", { status: 404 });
  }

  const headerStore = await headers();
  const content = await buildTenantLlmsFullTxt(
    tenant,
    getTenantRequestContextFromHeaders(tenant, headerStore)
  );

  return new NextResponse(content, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain",
    },
  });
};
