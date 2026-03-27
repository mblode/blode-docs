import type { TenantResolution } from "@repo/contracts";
import type { Tenant } from "@repo/models";
import type { ContentEntry } from "@repo/previewing";
import {
  buildContentIndex,
  loadContentSource,
  loadSiteConfig,
} from "@repo/previewing";

import {
  getTenantContentSource,
  resolveSiteConfigAssets,
} from "@/lib/content-source";
import { buildNavigation, flattenNav } from "@/lib/navigation";
import { buildOpenApiRegistry } from "@/lib/openapi";
import { toDocHref } from "@/lib/routes";
import { getRequestProtocol } from "@/lib/tenancy";

interface TenantRequestContext {
  basePath?: string;
  protocol?: string;
  requestedHost?: string;
  strategy?: TenantResolution["strategy"] | null;
}

const getCanonicalHost = (
  tenant: Tenant,
  requestedHost?: string,
  strategy?: TenantResolution["strategy"] | null
) =>
  strategy === "custom-domain" && requestedHost
    ? requestedHost
    : tenant.primaryDomain;

const getCanonicalBasePath = (
  tenant: Tenant,
  basePath?: string,
  strategy?: TenantResolution["strategy"] | null
) => (strategy === "path" ? "" : basePath || tenant.pathPrefix || "");

export const getTenantRequestContextFromHeaders = (
  tenant: Tenant,
  headerStore: Pick<Headers, "get">
): TenantRequestContext => ({
  basePath: headerStore.get("x-tenant-base-path") ?? tenant.pathPrefix ?? "",
  protocol: getRequestProtocol(headerStore),
  requestedHost: headerStore.get("x-tenant-domain") ?? undefined,
  strategy: (headerStore.get("x-tenant-strategy") ?? null) as
    | TenantResolution["strategy"]
    | null,
});

export const getCanonicalOrigin = (
  tenant: Tenant,
  context: TenantRequestContext = {}
) =>
  `${context.protocol ?? "https"}://${getCanonicalHost(
    tenant,
    context.requestedHost,
    context.strategy
  )}`;

const getCanonicalDocBasePath = (
  tenant: Tenant,
  context: TenantRequestContext = {}
) => getCanonicalBasePath(tenant, context.basePath, context.strategy);

const loadTenantUrlData = async (tenant: Tenant) => {
  const contentSource = getTenantContentSource(tenant);
  const configResult = await loadSiteConfig(contentSource);
  if (!configResult.ok) {
    throw new Error("Invalid config");
  }

  const config = await resolveSiteConfigAssets(
    configResult.config,
    contentSource
  );
  const contentIndex = await buildContentIndex(contentSource, config);
  if (contentIndex.errors.length) {
    throw new Error("Invalid content");
  }

  const docsCollection = config.collections.find(
    (collection) => collection.type === "docs"
  );
  const docsNavigation = docsCollection?.navigation ?? config.navigation;
  const docsCollectionWithNavigation =
    docsCollection &&
    docsNavigation &&
    docsCollection.navigation !== docsNavigation
      ? { ...docsCollection, navigation: docsNavigation }
      : docsCollection;
  const registry = await buildOpenApiRegistry(
    docsCollectionWithNavigation,
    contentSource
  );
  const nav = docsNavigation
    ? buildNavigation(
        docsNavigation,
        registry,
        docsCollection?.slugPrefix ?? ""
      )
    : [];
  const navPages = flattenNav(nav).map((page) => page.path);
  const contentPages = contentIndex.entries.map((entry) => entry.slug);

  return {
    config,
    contentIndex,
    contentSource,
    pages: [...new Set([...navPages, ...contentPages])],
  };
};

export const buildTenantSitemapXml = async (
  tenant: Tenant,
  context: TenantRequestContext = {}
) => {
  const { pages } = await loadTenantUrlData(tenant);
  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);
  const urls = pages.map((page) => `${origin}${toDocHref(page, basePath)}`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>`;
};

export const buildTenantRobotsTxt = (
  tenant: Tenant,
  context: TenantRequestContext = {}
) => {
  const origin = getCanonicalOrigin(tenant, context);
  return `User-agent: *
Allow: /
Sitemap: ${origin}/sitemap.xml

# LLM-friendly content
# ${origin}/llms.txt - Index of all documentation pages
# ${origin}/llms-full.txt - Full documentation content
# Append .mdx to any page URL for raw markdown`;
};

const FRONTMATTER_REGEX = /^---\s*\n[\s\S]*?\n---\s*\n?/;

const stripFrontmatter = (source: string) =>
  source.replace(FRONTMATTER_REGEX, "").trim();

export const buildTenantLlmsTxt = async (
  tenant: Tenant,
  context: TenantRequestContext = {}
) => {
  const { config, contentIndex } = await loadTenantUrlData(tenant);
  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);

  const entries = contentIndex.entries.filter(
    (entry): entry is Extract<ContentEntry, { kind: "entry" }> =>
      entry.kind === "entry"
  );

  const lines = [
    `# ${config.name}`,
    config.description ? `> ${config.description}` : null,
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
    "## Docs",
    ...entries.map((entry) => {
      const url = `${origin}${toDocHref(entry.slug, basePath)}`;
      const desc = entry.description ? `: ${entry.description}` : "";
      return `- [${entry.title}](${url})${desc}`;
    }),
  ];

  return lines.filter((line) => line !== null).join("\n");
};

export const buildTenantLlmsFullTxt = async (
  tenant: Tenant,
  context: TenantRequestContext = {}
) => {
  const { contentIndex, contentSource } = await loadTenantUrlData(tenant);
  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);

  const entries = contentIndex.entries.filter(
    (entry): entry is Extract<ContentEntry, { kind: "entry" }> =>
      entry.kind === "entry"
  );

  const parts = await Promise.all(
    entries.map(async (entry) => {
      const raw = await loadContentSource(contentSource, entry.relativePath);
      const body = stripFrontmatter(raw);
      const url = `${origin}${toDocHref(entry.slug, basePath)}`;
      return `# ${entry.title} (${url})\n\n${body}`;
    })
  );

  return parts.join("\n\n");
};

export const getLlmPageText = async (tenant: Tenant, slug: string) => {
  const contentSource = getTenantContentSource(tenant);
  const configResult = await loadSiteConfig(contentSource);
  if (!configResult.ok) {
    return null;
  }

  const config = await resolveSiteConfigAssets(
    configResult.config,
    contentSource
  );
  const contentIndex = await buildContentIndex(contentSource, config);
  const entry = contentIndex.bySlug.get(slug);
  if (!entry || entry.kind !== "entry") {
    return null;
  }

  const raw = await loadContentSource(contentSource, entry.relativePath);
  const body = stripFrontmatter(raw);
  return `# ${entry.title}\n\n${body}`;
};

export const getTenantMetadata = async (tenant: Tenant) => {
  const contentSource = getTenantContentSource(tenant);
  const configResult = await loadSiteConfig(contentSource);
  if (!configResult.ok) {
    return null;
  }

  const config = await resolveSiteConfigAssets(
    configResult.config,
    contentSource
  );

  return config;
};
