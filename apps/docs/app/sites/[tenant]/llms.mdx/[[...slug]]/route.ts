import { NextResponse } from "next/server";

import { getLlmPageText } from "@/lib/tenant-static";
import { getTenantBySlug } from "@/lib/tenants";

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

  return new NextResponse(content, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/markdown",
    },
  });
};
