import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getMarkdownExportSlug,
  getMarkdownExportSourcePath,
  stripBasePath,
  toMarkdownDocHref,
} from "./lib/routes";
import {
  getRequestHost,
  isReservedPath,
  isRootRuntimeHost,
  resolveTenant,
} from "./lib/tenancy";
import { TENANT_HEADERS } from "./lib/tenant-headers";
import { applyTenantUtilityContextSearchParams } from "./lib/tenant-utility-context";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const TENANT_UTILITY_SUFFIXES = [
  "/llms-full.txt",
  "/llms.txt",
  "/robots.txt",
  "/sitemap.xml",
] as const;
const TENANT_UTILITY_REWRITE_PATHS = {
  "/llms-full.txt": "/llms-full.txt",
  "/llms.txt": "/llms.txt",
  "/robots.txt": "/robots.txt",
  "/sitemap.xml": "/sitemap",
} as const;

const isTenantUtilityPath = (pathname: string) =>
  TENANT_UTILITY_SUFFIXES.some((suffix) => pathname.endsWith(suffix));

const getTenantUtilityRewritePath = (
  pathname: string,
  basePath: string,
  tenantSlug: string
) => {
  const normalizedPath = stripBasePath(pathname, basePath);
  const utilityPath =
    TENANT_UTILITY_REWRITE_PATHS[
      normalizedPath as keyof typeof TENANT_UTILITY_REWRITE_PATHS
    ];
  if (!utilityPath) {
    return null;
  }

  return `/sites/${tenantSlug}${utilityPath}`;
};

const getRedirectPathname = (
  pathname: string,
  currentBasePath: string,
  targetBasePath: string,
  markdownSourcePath: string | null
) => {
  if (!markdownSourcePath) {
    const relativePath = stripBasePath(pathname, currentBasePath);
    return `${targetBasePath}${relativePath}`.replaceAll(/\/+/g, "/");
  }

  const relativePath = stripBasePath(markdownSourcePath, currentBasePath);
  const relativeSlug = relativePath === "/" ? "index" : relativePath.slice(1);

  return toMarkdownDocHref(relativeSlug, targetBasePath);
};

// oxlint-disable-next-line eslint/complexity
export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const markdownSourcePath = getMarkdownExportSourcePath(pathname);

  if (pathname.startsWith("/sites")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const host = getRequestHost(request.headers);
  if (!host) {
    return NextResponse.next();
  }

  const allowTenantUtilityRewrite =
    !isRootRuntimeHost(host) && isTenantUtilityPath(pathname);

  if (isReservedPath(pathname) && !allowTenantUtilityRewrite) {
    return NextResponse.next();
  }

  const resolution = await resolveTenant(host, markdownSourcePath ?? pathname);

  if (!resolution) {
    if (pathname === "/" && isRootRuntimeHost(host)) {
      return NextResponse.next();
    }

    return new NextResponse("Not Found", { status: 404 });
  }

  const preferCustomDomain = process.env.PREFER_CUSTOM_DOMAIN === "true";
  if (
    preferCustomDomain &&
    resolution.strategy !== "custom-domain" &&
    resolution.tenant.customDomains.length > 0
  ) {
    const [targetHost] = resolution.tenant.customDomains;
    if (targetHost) {
      const redirectUrl = new URL(request.url);
      redirectUrl.hostname = targetHost;
      redirectUrl.pathname = getRedirectPathname(
        pathname,
        resolution.basePath,
        resolution.tenant.pathPrefix ?? "",
        markdownSourcePath
      );
      return NextResponse.redirect(redirectUrl, 308);
    }
  }

  const redirectToPrimary = process.env.REDIRECT_PRIMARY_DOMAIN === "true";
  if (
    redirectToPrimary &&
    resolution.strategy !== "preview" &&
    resolution.tenant.primaryDomain &&
    resolution.host !== resolution.tenant.primaryDomain
  ) {
    const redirectUrl = new URL(request.url);
    redirectUrl.hostname = resolution.tenant.primaryDomain;
    redirectUrl.pathname = getRedirectPathname(
      pathname,
      resolution.basePath,
      preferCustomDomain ? (resolution.tenant.pathPrefix ?? "") : "",
      markdownSourcePath
    );
    return NextResponse.redirect(redirectUrl, 308);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_HEADERS.ID, resolution.tenant.id);
  requestHeaders.set(TENANT_HEADERS.SLUG, resolution.tenant.slug);
  requestHeaders.set(TENANT_HEADERS.DOMAIN, resolution.host);
  requestHeaders.set(TENANT_HEADERS.STRATEGY, resolution.strategy);
  requestHeaders.set(TENANT_HEADERS.BASE_PATH, resolution.basePath);
  requestHeaders.set(TENANT_HEADERS.NAME, resolution.tenant.name);
  requestHeaders.set(
    TENANT_HEADERS.PRIMARY_DOMAIN,
    resolution.tenant.primaryDomain
  );
  requestHeaders.set(TENANT_HEADERS.SUBDOMAIN, resolution.tenant.subdomain);
  if (resolution.tenant.activeDeploymentId) {
    requestHeaders.set(
      TENANT_HEADERS.DEPLOYMENT_ID,
      resolution.tenant.activeDeploymentId
    );
  }
  if (resolution.tenant.activeDeploymentManifestUrl) {
    requestHeaders.set(
      TENANT_HEADERS.MANIFEST_URL,
      resolution.tenant.activeDeploymentManifestUrl
    );
  }
  if (resolution.tenant.pathPrefix) {
    requestHeaders.set(
      TENANT_HEADERS.PATH_PREFIX,
      resolution.tenant.pathPrefix
    );
  }
  if (resolution.tenant.customDomains.length > 0) {
    requestHeaders.set(
      TENANT_HEADERS.CUSTOM_DOMAINS,
      resolution.tenant.customDomains.join(",")
    );
  }

  const url = request.nextUrl.clone();
  const rewritten = resolution.rewrittenPath;
  const utilityRewritePath = getTenantUtilityRewritePath(
    pathname,
    resolution.basePath,
    resolution.tenant.slug
  );
  const markdownSlug = getMarkdownExportSlug(pathname, resolution.basePath);
  const acceptsMarkdown =
    !markdownSlug &&
    (request.headers.get("accept") ?? "").includes("text/markdown");
  const effectiveMarkdownSlug =
    markdownSlug ??
    (acceptsMarkdown
      ? getMarkdownExportSlug(`${pathname}.md`, resolution.basePath)
      : null);

  if (effectiveMarkdownSlug !== null && !pathname.includes("/llms.mdx/")) {
    const tenantPrefix = `/sites/${resolution.tenant.slug}`;
    url.pathname = `${tenantPrefix}/llms.mdx/${effectiveMarkdownSlug}`;
  } else if (utilityRewritePath) {
    url.pathname = utilityRewritePath;
  } else {
    url.pathname = rewritten;
  }

  if (utilityRewritePath) {
    applyTenantUtilityContextSearchParams(url, {
      basePath: resolution.basePath,
      protocol: request.nextUrl.protocol.replace(/:$/, ""),
      requestedHost: resolution.host,
      strategy: resolution.strategy,
    });
  }

  const response = NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  });

  // Cache the rewritten HTML at the CDN layer even when Next marks the final
  // response dynamic. Content changes are still invalidated explicitly.
  response.headers.set(
    "CDN-Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400"
  );
  response.headers.set(
    "Vercel-CDN-Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400"
  );
  // Multi-tenant: same path may serve different content per Host or Accept header
  response.headers.set("Vary", "Host, accept");

  // Advertise the llms.txt index to AI agents via standard HTTP headers
  const llmsBasePath = resolution.basePath ? `/${resolution.basePath}` : "";
  response.headers.set(
    "Link",
    `<${llmsBasePath}/llms.txt>; rel="llms-txt", <${llmsBasePath}/llms-full.txt>; rel="llms-full-txt"`
  );
  response.headers.set("X-Llms-Txt", `${llmsBasePath}/llms.txt`);

  return response;
};
