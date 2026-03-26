import path from "node:path";

import type { SiteConfig, Tenant } from "@repo/models";
import type { ContentSource } from "@repo/previewing";
import { createBlobSource, createFsSource } from "@repo/previewing";

import { getProjectTag } from "./tenants";

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const resolveAssetUrl = async (
  source: ContentSource,
  value?: string
): Promise<string | undefined> => {
  if (!value || value.startsWith("/") || ABSOLUTE_URL_REGEX.test(value)) {
    return value;
  }

  const resolved = await source.resolveUrl?.(value);
  return resolved ?? value;
};

export const getTenantContentSource = (tenant: Tenant): ContentSource => {
  if (tenant.activeDeploymentManifestUrl) {
    return createBlobSource(
      tenant.activeDeploymentManifestUrl,
      getProjectTag(tenant.slug)
    );
  }

  return createFsSource(
    tenant.docsPath ?? path.join(process.cwd(), "content", tenant.slug)
  );
};

export const resolveSiteConfigAssets = async (
  config: SiteConfig,
  source: ContentSource
): Promise<SiteConfig> => ({
  ...config,
  favicon: await resolveAssetUrl(source, config.favicon),
  fonts: config.fonts
    ? {
        ...config.fonts,
        cssUrl: await resolveAssetUrl(source, config.fonts.cssUrl),
      }
    : config.fonts,
  logo: config.logo
    ? {
        ...config.logo,
        dark: await resolveAssetUrl(source, config.logo.dark),
        light: await resolveAssetUrl(source, config.logo.light),
      }
    : config.logo,
  metadata: config.metadata
    ? {
        ...config.metadata,
        ogImage: await resolveAssetUrl(source, config.metadata.ogImage),
      }
    : config.metadata,
});
