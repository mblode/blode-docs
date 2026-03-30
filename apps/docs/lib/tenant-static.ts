import type { TenantResolution } from "@repo/contracts";
import type { Tenant } from "@repo/models";
import type { UtilityIndex } from "@repo/previewing";
import {
  buildContentIndex,
  buildPageMetadataMap,
  getPrebuiltUtilityLlmPagePath,
  loadContentSource,
  loadPrebuiltUtilityIndex,
  loadSiteConfig,
  PREBUILT_UTILITY_LLMS_FULL_PATH,
  PREBUILT_UTILITY_LLMS_PATH,
  PREBUILT_UTILITY_SITEMAP_PATH,
  UTILITY_DOCS_ROOT_TOKEN,
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
import type { TenantRequestContext } from "@/lib/tenant-utility-context";

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
) => {
  if (strategy === "path") {
    return basePath || `/${tenant.slug}`;
  }
  if (strategy === "custom-domain") {
    return basePath ?? tenant.pathPrefix ?? "";
  }
  return basePath ?? "";
};

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

export const getStaticTenantRequestContext = (
  tenant: Tenant
): TenantRequestContext => ({
  basePath: tenant.pathPrefix ?? "",
  protocol: "https",
  requestedHost: tenant.primaryDomain,
  strategy: tenant.customDomains.length > 0 ? "custom-domain" : null,
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

const renderUtilityTemplate = (
  source: string,
  tenant: Tenant,
  context: TenantRequestContext = {}
) =>
  source.replaceAll(
    UTILITY_DOCS_ROOT_TOKEN,
    `${getCanonicalOrigin(tenant, context)}${getCanonicalDocBasePath(
      tenant,
      context
    )}`
  );

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

const FRONTMATTER_REGEX = /^---\s*\n[\s\S]*?\n---\s*\n?/;

const stripFrontmatter = (source: string) =>
  source.replace(FRONTMATTER_REGEX, "").trim();

const buildRuntimeUtilityIndex = async (
  tenant: Tenant
): Promise<UtilityIndex> => {
  const data = await loadTenantUrlData(tenant);
  const pages = await Promise.all(
    resolveLlmPages(data).map(async (page) => {
      if (page.kind === "openapi") {
        return {
          content: formatOpenApiPageText(page.entry),
          description: page.description,
          slug: page.slug,
          title: page.title,
        };
      }

      const raw = await loadContentSource(
        data.contentSource,
        page.relativePath
      );
      return {
        content: stripFrontmatter(raw),
        description: page.description,
        slug: page.slug,
        title: page.title,
      };
    })
  );

  return {
    description: data.config.description,
    name: data.config.name,
    pages,
  };
};

const loadTenantUtilityIndex = async (tenant: Tenant) => {
  const prebuilt = await loadPrebuiltUtilityIndex(
    getTenantContentSource(tenant)
  );
  if (prebuilt) {
    return prebuilt;
  }

  return await buildRuntimeUtilityIndex(tenant);
};

const loadTenantUtilityTemplate = async (tenant: Tenant, path: string) => {
  const contentSource = getTenantContentSource(tenant);
  if (!(await contentSource.exists(path))) {
    return null;
  }
  return await contentSource.readFile(path);
};

export const buildTenantSitemapXml = async (
  tenant: Tenant,
  context: TenantRequestContext = {}
) => {
  const prebuilt = await loadTenantUtilityTemplate(
    tenant,
    PREBUILT_UTILITY_SITEMAP_PATH
  );
  if (prebuilt) {
    return renderUtilityTemplate(prebuilt, tenant, context);
  }

  const { pages } = await loadTenantUtilityIndex(tenant);
  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);
  const urls = pages.map(
    (page) => `${origin}${toDocHref(page.slug, basePath)}`
  );

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

export const buildTenantLlmsTxt = async (
  tenant: Tenant,
  context: TenantRequestContext = {}
) => {
  const prebuilt = await loadTenantUtilityTemplate(
    tenant,
    PREBUILT_UTILITY_LLMS_PATH
  );
  if (prebuilt) {
    return renderUtilityTemplate(prebuilt, tenant, context);
  }

  const data = await loadTenantUtilityIndex(tenant);
  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);

  const lines = [
    `# ${data.name}`,
    data.description ? `> ${data.description}` : null,
    "",
    `Sitemap: ${origin}${toDocHref("sitemap.xml", basePath)}`,
    "",
    "## Docs",
    ...data.pages.map((page) => {
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
  const prebuilt = await loadTenantUtilityTemplate(
    tenant,
    PREBUILT_UTILITY_LLMS_FULL_PATH
  );
  if (prebuilt) {
    return renderUtilityTemplate(prebuilt, tenant, context);
  }

  const data = await loadTenantUtilityIndex(tenant);
  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);
  const parts = data.pages.map((page) => {
    const url = `${origin}${toDocHref(page.slug, basePath)}`;
    return `# ${page.title} (${url})\n\n${page.content}`;
  });

  return parts.join("\n\n");
};

export const getLlmPageText = async (tenant: Tenant, slug: string) => {
  const prebuilt = await loadTenantUtilityTemplate(
    tenant,
    getPrebuiltUtilityLlmPagePath(slug)
  );
  if (prebuilt) {
    return prebuilt;
  }

  const data = await loadTenantUtilityIndex(tenant);
  const page = data.pages.find((item) => item.slug === slug);
  if (!page) {
    return null;
  }
  return `# ${page.title}\n\n${page.content}`;
};
