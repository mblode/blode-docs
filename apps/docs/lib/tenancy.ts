import { TenantResolutionSchema } from "@repo/contracts";

import { docsApiBase } from "./env";
import { platformConfig } from "./platform-config";
import { createTimedPromiseCache } from "./server-cache";

const DEFAULT_RESERVED_PATHS = [
  "/blodemd-internal",
  "/_next",
  "/.well-known",
  "/favicon.ico",
  "/llms.txt",
  "/oauth",
  "/robots.txt",
  "/sitemap.xml",
  "/logos",
  "/file-text.svg",
  "/globe.svg",
  "/next.svg",
  "/turborepo-dark.svg",
  "/turborepo-light.svg",
  "/vercel.svg",
  "/window.svg",
];

const LOCAL_ROOT_HOSTS = new Set(["localhost", "127.0.0.1"]);

const normalizeHost = (host: string) =>
  host.trim().toLowerCase().replace(/:\d+$/, "");

const tenantResolutionCache = createTimedPromiseCache<
  string,
  Awaited<ReturnType<typeof fetchTenantResolution>>
>({
  maxEntries: 512,
  ttlMs: 30 * 1000,
});

export const getRequestHost = (headerSource: Pick<Headers, "get">) => {
  const forwardedHost = headerSource.get("x-forwarded-host");
  return normalizeHost(
    forwardedHost?.split(",")[0]?.trim() || headerSource.get("host") || ""
  );
};

export const getRequestProtocol = (headerSource: Pick<Headers, "get">) =>
  headerSource.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";

export const isRootRuntimeHost = (host: string) => {
  const normalizedHost = normalizeHost(host);
  return (
    normalizedHost === platformConfig.rootDomain ||
    LOCAL_ROOT_HOSTS.has(normalizedHost) ||
    normalizedHost.endsWith(".localhost")
  );
};

export const isReservedPath = (pathname: string) => {
  const { assetPrefix } = platformConfig;
  if (assetPrefix && pathname.startsWith(assetPrefix)) {
    return true;
  }
  return DEFAULT_RESERVED_PATHS.some((prefix) => pathname.startsWith(prefix));
};

const fetchTenantResolution = async (host: string, pathname: string) => {
  const url = new URL("/tenants/resolve", docsApiBase);
  url.searchParams.set("host", normalizeHost(host));
  url.searchParams.set("path", pathname);
  let response: Response;
  try {
    response = await fetch(url.toString(), { next: { revalidate: 5 } });
  } catch {
    return null;
  }
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

export const clearTenantResolutionCache = () => {
  tenantResolutionCache.clear();
};

export const resolveTenant = async (host: string, pathname: string) => {
  const cacheKey = `${normalizeHost(host)}:${pathname}`;
  return await tenantResolutionCache.getOrCreate(
    cacheKey,
    async () => await fetchTenantResolution(host, pathname)
  );
};
