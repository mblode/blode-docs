import { NextResponse } from "next/server";

import {
  buildTenantSkillMd,
  buildTenantSkillsIndex,
  getStaticTenantRequestContext,
} from "@/lib/tenant-static";
import { getTenantRequestContextFromUrl } from "@/lib/tenant-utility-context";
import { getTenantBySlug } from "@/lib/tenants";

export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const revalidate = 3600;

const CACHE_HEADERS = {
  "CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "Cache-Control": "public, max-age=3600",
  "Vercel-CDN-Cache-Control":
    "public, s-maxage=3600, stale-while-revalidate=86400",
} as const;

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ tenant: string; path: string[] }> }
) => {
  const { tenant: tenantSlug, path } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return new NextResponse("Not found", { status: 404 });
  }

  const context =
    getTenantRequestContextFromUrl(new URL(request.url)) ??
    getStaticTenantRequestContext(tenant);
  const filePath = path.join("/");

  if (filePath === "index.json") {
    const content = await buildTenantSkillsIndex(tenant, context);

    return new NextResponse(content, {
      headers: {
        ...CACHE_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  }

  if (filePath.endsWith("/SKILL.md")) {
    const skillName = filePath.replace(/\/SKILL\.md$/, "");
    const content = await buildTenantSkillMd(tenant, skillName, context);
    if (!content) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(content, {
      headers: {
        ...CACHE_HEADERS,
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  }

  return new NextResponse("Not found", { status: 404 });
};
