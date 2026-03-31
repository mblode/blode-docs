import type { Tenant } from "@repo/contracts";
import { TenantResolutionSchema } from "@repo/contracts";

import {
  getTenantEdgeHostRecord,
  getTenantEdgeSlugRecord,
} from "./edge-config";
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
const TRAILING_SLASHES_REGEX = /\/+$/;
const LEADING_SLASHES_REGEX = /^\/+/;
const BACKSLASH_TO_SLASH_REGEX = /\\/g;
const DEFAULT_DOCS_BASE_PATH = "/docs";
const TENANT_RESOLUTION_REVALIDATE_SECONDS = 300;
const ROOT_TENANT_UTILITY_PATHS = new Set([
  "/llms-full.txt",
  "/llms.txt",
  "/robots.txt",
  "/sitemap.xml",
]);

const normalizeHost = (host: string) =>
  host.trim().toLowerCase().replace(/:\d+$/, "");

const getPortlessHost = () => {
  const portlessUrl = process.env.PORTLESS_URL?.trim();
  if (!portlessUrl) {
    return null;
  }

  try {
    return normalizeHost(new URL(portlessUrl).host);
  } catch {
    return normalizeHost(portlessUrl);
  }
};

const slugifyPath = (value: string) => {
  const trimmed = value
    .replace(BACKSLASH_TO_SLASH_REGEX, "/")
    .replace(TRAILING_SLASHES_REGEX, "");
  return trimmed.replace(LEADING_SLASHES_REGEX, "");
};

const stripPrefix = (pathname: string, prefix: string | null) => {
  if (!prefix) {
    return slugifyPath(pathname);
  }

  const normalizedPath = slugifyPath(pathname);
  const normalizedPrefix = slugifyPath(prefix);
  if (!normalizedPrefix) {
    return normalizedPath;
  }

  if (normalizedPath === normalizedPrefix) {
    return "";
  }

  if (normalizedPath.startsWith(`${normalizedPrefix}/`)) {
    return normalizedPath.slice(normalizedPrefix.length + 1);
  }

  return null;
};

const tenantResolutionCache = createTimedPromiseCache<
  string,
  Awaited<ReturnType<typeof fetchTenantResolution>>
>({
  maxEntries: 512,
  ttlMs: TENANT_RESOLUTION_REVALIDATE_SECONDS * 1000,
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
    normalizedHost === getPortlessHost()
  );
};

export const isReservedPath = (pathname: string) => {
  const { assetPrefix } = platformConfig;
  if (assetPrefix && pathname.startsWith(assetPrefix)) {
    return true;
  }
  return DEFAULT_RESERVED_PATHS.some((prefix) => pathname.startsWith(prefix));
};

const resolveSubdomainBasePath = (pathname: string): string => {
  const normalizedPath = slugifyPath(pathname);

  if (
    normalizedPath === "docs" ||
    normalizedPath.startsWith(`${slugifyPath(DEFAULT_DOCS_BASE_PATH)}/`)
  ) {
    return DEFAULT_DOCS_BASE_PATH;
  }

  return "";
};

const buildTenantPathResolution = (
  tenant: Tenant,
  strategy: "preview" | "subdomain" | "custom-domain",
  host: string,
  pathname: string,
  basePath: string
) => {
  if (ROOT_TENANT_UTILITY_PATHS.has(pathname)) {
    return {
      basePath,
      host,
      rewrittenPath: `/sites/${tenant.slug}${pathname}`,
      strategy,
      tenant,
    };
  }

  const slugPath = stripPrefix(pathname, basePath || null);
  if (slugPath === null) {
    return null;
  }

  const rewrittenPath = slugPath
    ? `/sites/${tenant.slug}/${slugPath}`
    : `/sites/${tenant.slug}/`;

  return {
    basePath,
    host,
    rewrittenPath,
    strategy,
    tenant,
  };
};

const buildPathTenantResolution = (
  tenant: Tenant,
  host: string,
  pathname: string
) => {
  const normalized = slugifyPath(pathname);
  const parts = normalized ? normalized.split("/") : [];
  const [projectSlug, ...rest] = parts;
  if (!projectSlug || projectSlug !== tenant.slug) {
    return null;
  }

  const remainder = rest.join("/");
  return {
    basePath: `/${tenant.slug}`,
    host,
    rewrittenPath: remainder
      ? `/sites/${tenant.slug}/${remainder}`
      : `/sites/${tenant.slug}/`,
    strategy: "path" as const,
    tenant,
  };
};

const fetchTenantResolutionFromApi = async (host: string, pathname: string) => {
  const url = new URL("/tenants/resolve", docsApiBase);
  url.searchParams.set("host", normalizeHost(host));
  url.searchParams.set("path", pathname);
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      next: { revalidate: TENANT_RESOLUTION_REVALIDATE_SECONDS },
    });
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

export const resolveTenantFromEdgeConfig = async (
  host: string,
  pathname: string
) => {
  const normalizedHost = normalizeHost(host);
  const hostRecord = await getTenantEdgeHostRecord(normalizedHost);
  if (hostRecord) {
    const basePath =
      hostRecord.strategy === "subdomain"
        ? resolveSubdomainBasePath(pathname)
        : (hostRecord.pathPrefix ?? "");

    return buildTenantPathResolution(
      hostRecord.tenant,
      hostRecord.strategy,
      normalizedHost,
      pathname,
      basePath
    );
  }

  const previewPrefix = normalizedHost.includes("---")
    ? normalizedHost.split("---")[0]
    : null;
  if (previewPrefix) {
    const previewRecord = await getTenantEdgeSlugRecord(previewPrefix);
    if (previewRecord) {
      return buildTenantPathResolution(
        previewRecord.tenant,
        "preview",
        normalizedHost,
        pathname,
        resolveSubdomainBasePath(pathname)
      );
    }
  }

  const localSuffixes = ["localhost", "127.0.0.1"];
  const localSuffix = localSuffixes.find((suffix) =>
    normalizedHost.endsWith(`.${suffix}`)
  );
  if (localSuffix) {
    const subdomain = normalizedHost.slice(0, -1 * (localSuffix.length + 1));
    if (subdomain) {
      const subdomainRecord = await getTenantEdgeSlugRecord(subdomain);
      if (subdomainRecord) {
        return buildTenantPathResolution(
          subdomainRecord.tenant,
          "subdomain",
          normalizedHost,
          pathname,
          resolveSubdomainBasePath(pathname)
        );
      }
    }
  }

  if (normalizedHost.endsWith(`.${platformConfig.rootDomain}`)) {
    const subdomain = normalizedHost.slice(
      0,
      -1 * (platformConfig.rootDomain.length + 1)
    );
    if (
      subdomain &&
      !["www", "app", "admin", "dashboard"].includes(subdomain)
    ) {
      const subdomainRecord = await getTenantEdgeSlugRecord(subdomain);
      if (subdomainRecord) {
        return buildTenantPathResolution(
          subdomainRecord.tenant,
          "subdomain",
          normalizedHost,
          pathname,
          resolveSubdomainBasePath(pathname)
        );
      }
    }
  }

  if (isRootRuntimeHost(normalizedHost)) {
    const normalizedPath = slugifyPath(pathname);
    const [projectSlug] = normalizedPath.split("/");
    if (projectSlug) {
      const pathRecord = await getTenantEdgeSlugRecord(projectSlug);
      if (pathRecord) {
        return buildPathTenantResolution(
          pathRecord.tenant,
          normalizedHost,
          pathname
        );
      }
    }
  }

  return null;
};

const fetchTenantResolution = async (host: string, pathname: string) => {
  const edgeResolution = await resolveTenantFromEdgeConfig(host, pathname);
  if (edgeResolution) {
    return edgeResolution;
  }

  return await fetchTenantResolutionFromApi(host, pathname);
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
