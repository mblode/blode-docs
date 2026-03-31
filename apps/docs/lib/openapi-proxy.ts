import type { Tenant } from "@repo/models";
import { loadSiteConfig } from "@repo/previewing";

import { getTenantContentSource } from "@/lib/content-source";
import { getDocsCollectionWithNavigation } from "@/lib/docs-collection";
import { loadOpenApiRegistry } from "@/lib/openapi";
import { createTimedPromiseCache } from "@/lib/server-cache";

const OPENAPI_PROXY_CACHE_TTL_MS = 30 * 60 * 1000;

interface OpenApiProxyConfig {
  allowedHosts: string[];
  enabled: boolean;
}

const openApiProxyConfigCache = createTimedPromiseCache<
  string,
  OpenApiProxyConfig | null
>({
  maxEntries: 512,
  ttlMs: OPENAPI_PROXY_CACHE_TTL_MS,
});

const getOpenApiProxyCacheKey = (tenant: Tenant) =>
  [
    tenant.id,
    tenant.slug,
    tenant.activeDeploymentId ?? "",
    tenant.activeDeploymentManifestUrl ?? "",
    tenant.docsPath ?? "",
  ].join(":");

const normalizeAllowedHosts = (hosts: string[]): string[] => [
  ...new Set(hosts.map((host) => host.trim().toLowerCase()).filter(Boolean)),
];

export const clearOpenApiProxyConfigCache = () => {
  openApiProxyConfigCache.clear();
};

export const clearOpenApiProxyConfigCacheForTenant = (tenantId: string) => {
  openApiProxyConfigCache.deleteByPrefix(tenantId);
};

export const loadOpenApiProxyConfig = async (
  tenant: Tenant
): Promise<OpenApiProxyConfig | null> => {
  const cacheKey = getOpenApiProxyCacheKey(tenant);

  return await openApiProxyConfigCache.getOrCreate(cacheKey, async () => {
    const contentSource = getTenantContentSource(tenant);
    const configResult = await loadSiteConfig(contentSource);
    if (!configResult.ok) {
      return null;
    }

    const configuredHosts = normalizeAllowedHosts(
      configResult.config.openapiProxy?.allowedHosts ?? []
    );
    if (!configResult.config.openapiProxy?.enabled || configuredHosts.length) {
      return {
        allowedHosts: configuredHosts,
        enabled: configResult.config.openapiProxy?.enabled === true,
      };
    }

    const registry = await loadOpenApiRegistry(
      getDocsCollectionWithNavigation(configResult.config),
      contentSource
    );
    const derivedHosts = normalizeAllowedHosts(
      registry.entries.flatMap((entry) =>
        (entry.spec.servers ?? []).flatMap((server) => {
          try {
            return [new URL(server.url).hostname];
          } catch {
            return [];
          }
        })
      )
    );

    return {
      allowedHosts: derivedHosts,
      enabled: true,
    };
  });
};
