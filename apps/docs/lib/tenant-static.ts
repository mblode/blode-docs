import type { TenantResolution } from "@repo/contracts";
import type { Tenant } from "@repo/models";
import {
  buildContentIndex,
  buildPageMetadataMap,
  loadContentSource,
  loadSiteConfig,
} from "@repo/previewing";

import {
  getTenantContentSource,
  resolveSiteConfigAssets,
} from "@/lib/content-source";
import {
  getDocsCollection,
  getDocsCollectionWithNavigation,
  getDocsNavigation,
} from "@/lib/docs-collection";
import {
  buildNavigation,
  enrichNavWithMetadata,
  flattenNav,
  getVisibleNavigation,
} from "@/lib/navigation";
import type { OpenApiEntry } from "@/lib/openapi";
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
  (strategy === "custom-domain" || strategy === "path") && requestedHost
    ? requestedHost
    : tenant.primaryDomain;

const getCanonicalBasePath = (
  tenant: Tenant,
  basePath?: string,
  strategy?: TenantResolution["strategy"] | null
) =>
  strategy === "path"
    ? basePath || `/${tenant.slug}`
    : basePath || tenant.pathPrefix || "";

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

export const getCanonicalDocBasePath = (
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

  const docsCollection = getDocsCollection(config);
  const docsNavigation = getDocsNavigation(config);
  const docsCollectionWithNavigation = getDocsCollectionWithNavigation(config);
  const registry = await buildOpenApiRegistry(
    docsCollectionWithNavigation,
    contentSource
  );
  const metadataMap = buildPageMetadataMap(contentIndex);
  const rawNav = docsNavigation
    ? buildNavigation(
        docsNavigation,
        registry,
        docsCollection?.slugPrefix ?? ""
      )
    : [];
  const nav = enrichNavWithMetadata(rawNav, metadataMap);
  const visibleNav = getVisibleNavigation(nav);
  const hiddenSlugs = new Set<string>();
  for (const [slug, meta] of metadataMap) {
    if (meta.hidden || meta.noindex) {
      hiddenSlugs.add(slug);
    }
  }

  const navPages = flattenNav(visibleNav).map((page) => page.path);
  const contentPages = contentIndex.entries
    .filter(
      (entry) =>
        !(entry.kind === "entry" && entry.hidden) &&
        !hiddenSlugs.has(entry.slug)
    )
    .map((entry) => entry.slug);

  return {
    config,
    contentIndex,
    contentSource,
    hiddenSlugs,
    pages: [...new Set([...navPages, ...contentPages])],
    registry,
  };
};

const formatOpenApiPageText = (entry: OpenApiEntry): string => {
  const parts = [
    `Method: ${entry.operation.method}`,
    `Path: ${entry.operation.path}`,
  ];

  if (entry.operation.description) {
    parts.push(entry.operation.description);
  }
  if (entry.operation.tags.length) {
    parts.push(`Tags: ${entry.operation.tags.join(", ")}`);
  }
  if (entry.operation.parameters.length) {
    parts.push(
      `Parameters:\n${JSON.stringify(entry.operation.parameters, null, 2)}`
    );
  }
  if (entry.operation.requestBody) {
    parts.push(
      `Request Body:\n${JSON.stringify(entry.operation.requestBody, null, 2)}`
    );
  }
  if (entry.operation.responses) {
    parts.push(
      `Responses:\n${JSON.stringify(entry.operation.responses, null, 2)}`
    );
  }

  return parts.join("\n\n");
};

const resolveLlmPages = (
  data: Awaited<ReturnType<typeof loadTenantUrlData>>
): (
  | {
      kind: "content";
      relativePath: string;
      slug: string;
      title: string;
      description?: string;
    }
  | {
      kind: "openapi";
      entry: OpenApiEntry;
      slug: string;
      title: string;
      description?: string;
    }
)[] =>
  data.pages
    .map((slug) => {
      const contentEntry = data.contentIndex.bySlug.get(slug);
      if (
        contentEntry &&
        contentEntry.kind === "entry" &&
        !contentEntry.hidden &&
        !data.hiddenSlugs.has(contentEntry.slug)
      ) {
        return {
          description: contentEntry.description,
          kind: "content" as const,
          relativePath: contentEntry.relativePath,
          slug: contentEntry.slug,
          title: contentEntry.title,
        };
      }

      const openApiEntry = data.registry.bySlug.get(slug);
      if (!openApiEntry) {
        return null;
      }

      return {
        description: openApiEntry.operation.description,
        entry: openApiEntry,
        kind: "openapi" as const,
        slug,
        title: openApiEntry.operation.summary ?? openApiEntry.identifier,
      };
    })
    .filter((page) => page !== null);

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
  const basePath = getCanonicalDocBasePath(tenant, context);
  return `User-agent: *
Allow: /
Sitemap: ${origin}${toDocHref("sitemap.xml", basePath)}

# LLM-friendly content
# ${origin}${toDocHref("llms.txt", basePath)} - Index of all documentation pages
# ${origin}${toDocHref("llms-full.txt", basePath)} - Full documentation content
# Append .mdx to any page URL for raw markdown`;
};

const FRONTMATTER_REGEX = /^---\s*\n[\s\S]*?\n---\s*\n?/;

const stripFrontmatter = (source: string) =>
  source.replace(FRONTMATTER_REGEX, "").trim();

export const buildTenantLlmsTxt = async (
  tenant: Tenant,
  context: TenantRequestContext = {}
) => {
  const data = await loadTenantUrlData(tenant);
  const { config } = data;
  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);
  const pages = resolveLlmPages(data);

  const lines = [
    `# ${config.name}`,
    config.description ? `> ${config.description}` : null,
    "",
    `Sitemap: ${origin}${toDocHref("sitemap.xml", basePath)}`,
    "",
    "## Docs",
    ...pages.map((page) => {
      const url = `${origin}${toDocHref(page.slug, basePath)}`;
      const desc = page.description ? `: ${page.description}` : "";
      return `- [${page.title}](${url})${desc}`;
    }),
  ];

  return lines.filter((line) => line !== null).join("\n");
};

export const buildTenantLlmsFullTxt = async (
  tenant: Tenant,
  context: TenantRequestContext = {}
) => {
  const data = await loadTenantUrlData(tenant);
  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);
  const pages = resolveLlmPages(data);

  const parts = await Promise.all(
    pages.map(async (page) => {
      const url = `${origin}${toDocHref(page.slug, basePath)}`;
      if (page.kind === "openapi") {
        return `# ${page.title} (${url})\n\n${formatOpenApiPageText(page.entry)}`;
      }

      const raw = await loadContentSource(
        data.contentSource,
        page.relativePath
      );
      const body = stripFrontmatter(raw);
      return `# ${page.title} (${url})\n\n${body}`;
    })
  );

  return parts.join("\n\n");
};

export const getLlmPageText = async (tenant: Tenant, slug: string) => {
  const data = await loadTenantUrlData(tenant);
  const page = resolveLlmPages(data).find((item) => item.slug === slug);
  if (!page) {
    return null;
  }
  if (page.kind === "openapi") {
    return `# ${page.title}\n\n${formatOpenApiPageText(page.entry)}`;
  }

  const raw = await loadContentSource(data.contentSource, page.relativePath);
  const body = stripFrontmatter(raw);
  return `# ${page.title}\n\n${body}`;
};
