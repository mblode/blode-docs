import { TenantSchema } from "@repo/contracts";
import type { Tenant } from "@repo/models";

import { getTenantDocsPath } from "./content-root";
import { getTenantEdgeSlugRecord, isEdgeConfigEnabled } from "./edge-config";
import { docsApiBase } from "./env";
import { createTimedPromiseCache } from "./server-cache";

export const getProjectTag = (slug: string) => `project:${slug}`;

const TENANT_REVALIDATE_SECONDS = 3600;

const mapTenant = (tenant: {
  activeDeploymentId?: string;
  activeDeploymentManifestUrl?: string;
  id: string;
  slug: string;
  name: string;
  description?: string;
  primaryDomain: string;
  subdomain: string;
  customDomains: string[];
  pathPrefix?: string;
  status: "active" | "disabled";
}): Tenant => ({
  ...tenant,
  docsPath: getTenantDocsPath(tenant.slug),
});

const tenantCache = createTimedPromiseCache<string, Tenant | null>({
  maxEntries: 512,
  ttlMs: TENANT_REVALIDATE_SECONDS * 1000,
});

const fetchTenantFromApi = async (slug: string): Promise<Tenant | null> => {
  const url = new URL(`/tenants/${slug}`, docsApiBase);
  const response = await fetch(url.toString(), {
    next: {
      revalidate: TENANT_REVALIDATE_SECONDS,
      tags: [getProjectTag(slug), "tenants"],
    },
  });
  if (!response.ok) {
    return null;
  }
  const json = (await response.json()) as unknown;
  const parsed = TenantSchema.safeParse(json);
  if (!parsed.success) {
    return null;
  }
  return mapTenant(parsed.data);
};

const fetchTenant = async (slug: string): Promise<Tenant | null> => {
  if (isEdgeConfigEnabled()) {
    const edgeRecord = await getTenantEdgeSlugRecord(slug);
    return edgeRecord ? mapTenant(edgeRecord.tenant) : null;
  }

  return await fetchTenantFromApi(slug);
};

export const clearTenantCache = () => {
  tenantCache.clear();
};

export const getTenantBySlug = async (slug: string) =>
  await tenantCache.getOrCreate(slug, async () => await fetchTenant(slug));
