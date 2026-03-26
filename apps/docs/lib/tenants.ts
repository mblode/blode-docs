import path from "node:path";

import { TenantSchema } from "@repo/contracts";
import type { Tenant } from "@repo/models";

const apiBase =
  process.env.DOCS_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

const tenantDocsPath = (slug: string) =>
  path.join(process.cwd(), "content", slug);

export const getProjectTag = (slug: string) => `project:${slug}`;

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
  docsPath: tenantDocsPath(tenant.slug),
});

const fetchTenant = async (slug: string): Promise<Tenant | null> => {
  const url = new URL(`/tenants/${slug}`, apiBase);
  const response = await fetch(url.toString(), {
    next: { tags: [getProjectTag(slug), "tenants"] },
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

const fetchTenants = async (): Promise<Tenant[]> => {
  const url = new URL("/tenants", apiBase);
  const response = await fetch(url.toString(), {
    next: { tags: ["tenants"] },
  });
  if (!response.ok) {
    return [];
  }
  const json = (await response.json()) as unknown;
  const parsed = TenantSchema.array().safeParse(json);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.map(mapTenant);
};

export const listTenants = fetchTenants;

export const getTenantBySlug = fetchTenant;

export const getTenantBySubdomain = async (subdomain: string) => {
  const tenants = await listTenants();
  return tenants.find((tenant) => tenant.subdomain === subdomain) ?? null;
};

export const getTenantByCustomDomain = async (domain: string) => {
  const tenants = await listTenants();
  return (
    tenants.find((tenant) => tenant.customDomains.includes(domain)) ?? null
  );
};

export const getTenantByDomain = async (domain: string) => {
  const tenants = await listTenants();
  return (
    tenants.find((tenant) => tenant.primaryDomain === domain) ??
    tenants.find((tenant) => tenant.customDomains.includes(domain)) ??
    null
  );
};

export const getTenantByPathPrefix = async (prefix: string) => {
  const tenants = await listTenants();
  return tenants.find((tenant) => tenant.pathPrefix === prefix) ?? null;
};

export const getDefaultTenant = async () => {
  const tenants = await listTenants();
  return tenants[0] ?? null;
};
