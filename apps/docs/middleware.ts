import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isReservedPath, resolveTenant } from "./lib/tenancy";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/sites")) {
    return NextResponse.next();
  }

  if (isReservedPath(pathname)) {
    return NextResponse.next();
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host =
    forwardedHost?.split(",")[0]?.trim() || request.headers.get("host") || "";
  const resolution = await resolveTenant(host, pathname);

  if (!resolution) {
    return NextResponse.next();
  }

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

  const preferCustomDomain = process.env.PREFER_CUSTOM_DOMAIN === "true";
  if (
    preferCustomDomain &&
    resolution.strategy !== "custom-domain" &&
    resolution.tenant.customDomains.length > 0
  ) {
    const targetHost = resolution.tenant.customDomains[0];
    if (targetHost) {
      const redirectUrl = new URL(request.url);
      const customBasePath = resolution.tenant.pathPrefix ?? "";
      const normalizedPath = stripBasePath(pathname, resolution.basePath);
      redirectUrl.hostname = targetHost;
      redirectUrl.pathname = `${customBasePath}${normalizedPath}`.replaceAll(
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
    redirectUrl.hostname = resolution.tenant.primaryDomain;
    return NextResponse.redirect(redirectUrl, 308);
  }

  const url = request.nextUrl.clone();
  url.pathname = resolution.rewrittenPath;
  const response = NextResponse.rewrite(url);
  response.headers.set("x-tenant-id", resolution.tenant.id);
  response.headers.set("x-tenant-slug", resolution.tenant.slug);
  response.headers.set("x-tenant-domain", resolution.host);
  response.headers.set("x-tenant-strategy", resolution.strategy);
  response.headers.set("x-tenant-base-path", resolution.basePath);
  return response;
}
