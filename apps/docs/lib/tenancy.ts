import { TenantResolutionSchema } from "@repo/contracts";

import { platformConfig } from "./platform-config";

const DEFAULT_RESERVED_PATHS = [
  "/api",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
];
const apiBase =
  process.env.DOCS_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export const isReservedPath = (pathname: string) => {
  const { assetPrefix } = platformConfig;
  if (assetPrefix && pathname.startsWith(assetPrefix)) {
    return true;
  }
  return DEFAULT_RESERVED_PATHS.some((prefix) => pathname.startsWith(prefix));
};

export const resolveTenant = async (host: string, pathname: string) => {
  const url = new URL("/tenants/resolve", apiBase);
  url.searchParams.set("host", host);
  url.searchParams.set("path", pathname);
  const response = await fetch(url.toString(), { next: { revalidate: 5 } });
  if (!response.ok) {
    return null;
  }
  const json = (await response.json()) as unknown;
  const parsed = TenantResolutionSchema.safeParse(json);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
};
