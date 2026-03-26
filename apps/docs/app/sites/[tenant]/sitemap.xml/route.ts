import { buildContentIndex, loadSiteConfig } from "@repo/previewing";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  getTenantContentSource,
  resolveSiteConfigAssets,
} from "@/lib/content-source";
import { buildNavigation, flattenNav } from "@/lib/navigation";
import { buildOpenApiRegistry } from "@/lib/openapi";
import { toDocHref } from "@/lib/routes";
import { getTenantBySlug } from "@/lib/tenants";

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) => {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentSource = getTenantContentSource(tenant);
  const configResult = await loadSiteConfig(contentSource);
  if (!configResult.ok) {
    return new NextResponse("Invalid config", { status: 400 });
  }

  const config = await resolveSiteConfigAssets(
    configResult.config,
    contentSource
  );
  const contentIndex = await buildContentIndex(contentSource, config);
  if (contentIndex.errors.length) {
    return new NextResponse("Invalid content", { status: 400 });
  }
  const docsCollection = config.collections.find(
    (collection) => collection.type === "docs"
  );
  const docsNavigation = docsCollection?.navigation ?? config.navigation;
  const docsCollectionWithNavigation =
    docsCollection &&
    docsNavigation &&
    docsCollection.navigation !== docsNavigation
      ? { ...docsCollection, navigation: docsNavigation }
      : docsCollection;
  const registry = await buildOpenApiRegistry(
    docsCollectionWithNavigation,
    contentSource
  );
  const nav = docsNavigation
    ? buildNavigation(
        docsNavigation,
        registry,
        docsCollection?.slugPrefix ?? ""
      )
    : [];
  const navPages = flattenNav(nav).map((page) => page.path);
  const contentPages = contentIndex.entries.map((entry) => entry.slug);

  const headerStore = await headers();
  const host = headerStore.get("host") ?? "";
  const strategy = headerStore.get("x-tenant-strategy");
  const requestedHost = headerStore.get("x-tenant-domain");
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";
  const canonicalHost =
    strategy === "custom-domain" && requestedHost
      ? requestedHost
      : tenant.primaryDomain;
  const origin = `${protocol}://${canonicalHost || host}`;
  const basePathHeader =
    headerStore.get("x-tenant-base-path") ?? tenant.pathPrefix ?? "";
  const basePath = strategy === "path" ? "" : basePathHeader;

  const urls = [
    ...new Set(
      [...navPages, ...contentPages].map(
        (page) => `${origin}${toDocHref(page, basePath)}`
      )
    ),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/xml",
    },
  });
};
