import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getRequestHost,
  isReservedPath,
  isRootRuntimeHost,
  resolveTenant,
} from "./lib/tenancy";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const stripBasePath = (value: string, basePath: string) => {
  if (!basePath) {
    return value;
  }
  if (value === basePath) {
    return "/";
  }
  if (value.startsWith(`${basePath}/`)) {
    return value.slice(basePath.length) || "/";
  }
  return value;
};

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/sites")) {
    return NextResponse.next();
  }

  if (isReservedPath(pathname)) {
    return NextResponse.next();
  }

  const host = getRequestHost(request.headers);
  if (!host) {
    return NextResponse.next();
  }

  const resolution = await resolveTenant(host, pathname);

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
      const normalizedPath = stripBasePath(pathname, resolution.basePath);
      redirectUrl.hostname = targetHost;
      redirectUrl.pathname =
        `${resolution.tenant.pathPrefix ?? ""}${normalizedPath}`.replaceAll(
          /\/+/g,
          "/"
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
    const normalizedPath = stripBasePath(pathname, resolution.basePath);
    redirectUrl.hostname = resolution.tenant.primaryDomain;
    redirectUrl.pathname =
      `${resolution.tenant.pathPrefix ?? ""}${normalizedPath}`.replaceAll(
        /\/+/g,
        "/"
      );
    return NextResponse.redirect(redirectUrl, 308);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", resolution.tenant.id);
  requestHeaders.set("x-tenant-slug", resolution.tenant.slug);
  requestHeaders.set("x-tenant-domain", resolution.host);
  requestHeaders.set("x-tenant-strategy", resolution.strategy);
  requestHeaders.set("x-tenant-base-path", resolution.basePath);

  const url = request.nextUrl.clone();
  const rewritten = resolution.rewrittenPath;

  if (pathname.endsWith(".mdx") && !pathname.includes("/llms.mdx/")) {
    const stripped = pathname.slice(0, -4);
    const normalizedPath = stripBasePath(stripped, resolution.basePath);
    const slug = normalizedPath === "/" ? "" : normalizedPath.slice(1);
    const tenantPrefix = `/sites/${resolution.tenant.slug}`;
    url.pathname = `${tenantPrefix}/llms.mdx/${slug}`;
  } else {
    url.pathname = rewritten;
  }

  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  });
};
