import type { ProjectAnalytics } from "@repo/contracts";

export const TENANT_HEADERS = {
  ANALYTICS: "x-tenant-analytics",
  BASE_PATH: "x-tenant-base-path",
  CUSTOM_DOMAINS: "x-tenant-custom-domains",
  DEPLOYMENT_ID: "x-tenant-deployment-id",
  DOMAIN: "x-tenant-domain",
  ID: "x-tenant-id",
  MANIFEST_URL: "x-tenant-manifest-url",
  NAME: "x-tenant-name",
  PATH_PREFIX: "x-tenant-path-prefix",
  PRIMARY_DOMAIN: "x-tenant-primary-domain",
  SLUG: "x-tenant-slug",
  STRATEGY: "x-tenant-strategy",
  SUBDOMAIN: "x-tenant-subdomain",
} as const;

const hasAnyProvider = (value: ProjectAnalytics): boolean =>
  Boolean(value.ga4?.measurementId || value.posthog?.projectKey);

export const encodeTenantAnalyticsHeader = (
  analytics: ProjectAnalytics | undefined
): string | null => {
  if (!analytics || !hasAnyProvider(analytics)) {
    return null;
  }
  return encodeURIComponent(JSON.stringify(analytics));
};

export const decodeTenantAnalyticsHeader = (
  encoded: string | null | undefined
): ProjectAnalytics | null => {
  if (!encoded) {
    return null;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(encoded)) as ProjectAnalytics;
    return hasAnyProvider(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
