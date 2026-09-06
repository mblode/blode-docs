import { slugify } from "@repo/common";
import type { TenantResolution } from "@repo/contracts";
import { parseSiteUrl } from "@repo/models";
import type { Tenant } from "@repo/models";
import type { UtilityIndex } from "@repo/previewing";
import {
  absolutiseInternalLinks,
  buildContentIndex,
  buildPageMetadataMap,
  formatMarkdownPage,
  formatMarkdownPageSection,
  formatOpenApiPageContent,
  getPrebuiltUtilityLlmPagePath,
  loadPrebuiltContentIndex,
  loadPrebuiltUtilityIndex,
  loadSiteConfigForRender,
  PREBUILT_UTILITY_LLMS_FULL_PATH,
  PREBUILT_UTILITY_LLMS_PATH,
  PREBUILT_UTILITY_LLMS_SEGMENT_PREFIX,
  PREBUILT_UTILITY_SITEMAP_PATH,
  prepareLlmsFullContent,
  sanitizePlaceholderUrls,
  stripFrontmatter,
  toAgentMarkdown,
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
import { capLlmsFullContent } from "@/lib/llms-full";
import {
  buildNavigation,
  enrichNavWithMetadata,
  flattenNav,
  getVisibleNavigation,
} from "@/lib/navigation";
import type { NavGroup } from "@/lib/navigation";
import type { OpenApiEntry } from "@/lib/openapi";
import { loadOpenApiRegistry } from "@/lib/openapi";
import { toDocHref, toMarkdownDocHref } from "@/lib/routes";
import { createTimedPromiseCache } from "@/lib/server-cache";
import { getRequestProtocol } from "@/lib/tenancy";
import type { TenantRequestContext } from "@/lib/tenant-utility-context";

// Re-exported so tenant-static.unit.test.ts continues to guard the shared
// implementation now living in @repo/previewing.
export { absolutiseInternalLinks, sanitizePlaceholderUrls };

const TENANT_STATIC_CACHE_TTL_MS = 30 * 60 * 1000;

// Matches the docs root token only where it ends a URL, i.e. an index page.
const UTILITY_DOCS_ROOT_TOKEN_TAIL_REGEX = new RegExp(
  `${UTILITY_DOCS_ROOT_TOKEN}(?!/)`,
  "g"
);

const getTenantStaticCacheKey = (tenant: Tenant) =>
  [
    tenant.id,
    tenant.slug,
    tenant.activeDeploymentId ?? "",
    tenant.activeDeploymentManifestUrl ?? "",
    tenant.docsPath ?? "",
    tenant.pathPrefix ?? "",
    tenant.primaryDomain,
  ].join(":");

const tenantUrlDataCache = createTimedPromiseCache<
  string,
  Awaited<ReturnType<typeof buildTenantUrlData>>
>({
  maxEntries: 512,
  ttlMs: TENANT_STATIC_CACHE_TTL_MS,
});

const tenantUtilityIndexCache = createTimedPromiseCache<string, UtilityIndex>({
  maxEntries: 512,
  ttlMs: TENANT_STATIC_CACHE_TTL_MS,
});

const isMissingContentFileError = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  ) {
    return true;
  }

  return error instanceof Error && error.message.includes("not found");
};

const siteIdentityCache = createTimedPromiseCache<
  string,
  ReturnType<typeof parseSiteUrl> | null
>({
  maxEntries: 512,
  ttlMs: TENANT_STATIC_CACHE_TTL_MS,
});

/**
 * The site's own declaration of where it is published, from `seo.siteUrl`.
 * Null when the site has not declared one, in which case we fall back to
 * inferring it from the request -- which is only correct when nothing sits in
 * front of us.
 */
const loadDeclaredSiteUrl = async (tenant: Tenant) =>
  await siteIdentityCache.getOrCreate(
    getTenantStaticCacheKey(tenant),
    async () => {
      const configResult = await loadSiteConfigForRender(
        getTenantContentSource(tenant)
      );
      if (!configResult.ok) {
        return null;
      }
      const declared = configResult.config.seo?.siteUrl;
      return declared ? parseSiteUrl(declared) : null;
    }
  );

const getCanonicalHost = (
  tenant: Tenant,
  requestedHost?: string,
  strategy?: TenantResolution["strategy"] | null
) => {
  if ((strategy === "custom-domain" || strategy === "path") && requestedHost) {
    return requestedHost;
  }
  return tenant.primaryDomain;
};

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

export const getCanonicalOrigin = async (
  tenant: Tenant,
  context: TenantRequestContext = {}
) => {
  const declared = await loadDeclaredSiteUrl(tenant);
  if (declared) {
    return declared.origin;
  }
  return `${context.protocol ?? "https"}://${getCanonicalHost(
    tenant,
    context.requestedHost,
    context.strategy
  )}`;
};

export const getCanonicalDocBasePath = async (
  tenant: Tenant,
  context: TenantRequestContext = {}
) => {
  const declared = await loadDeclaredSiteUrl(tenant);
  if (declared) {
    return declared.basePath;
  }
  return getCanonicalBasePath(tenant, context.basePath, context.strategy);
};

const renderUtilityTemplate = async (
  source: string,
  tenant: Tenant,
  context: TenantRequestContext = {}
) => {
  const origin = await getCanonicalOrigin(tenant, context);
  const basePath = await getCanonicalDocBasePath(tenant, context);
  const docsRoot = `${origin}${basePath}`;
  // Index pages emit the bare token so the docs root never gains a trailing
  // slash. A tenant served from a domain root has no base path to stand in for
  // it, so put the slash back rather than emitting a bare origin.
  return source
    .replaceAll(
      UTILITY_DOCS_ROOT_TOKEN_TAIL_REGEX,
      basePath ? docsRoot : `${origin}/`
    )
    .replaceAll(UTILITY_DOCS_ROOT_TOKEN, docsRoot);
};

const buildTenantUrlData = async (tenant: Tenant) => {
  const contentSource = getTenantContentSource(tenant);
  const configResult = await loadSiteConfigForRender(contentSource);
  if (!configResult.ok) {
    throw new Error("Invalid config");
  }

  const config = await resolveSiteConfigAssets(
    configResult.config,
    contentSource
  );
  const contentIndex =
    (await loadPrebuiltContentIndex(contentSource)) ??
    (await buildContentIndex(contentSource, config));
  if (contentIndex.errors.length) {
    throw new Error("Invalid content");
  }

  const docsCollection = getDocsCollection(config);
  const docsNavigation = getDocsNavigation(config);
  const docsCollectionWithNavigation = getDocsCollectionWithNavigation(config);
  const registry = await loadOpenApiRegistry(
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
    visibleNav,
  };
};

const loadTenantUrlData = async (tenant: Tenant) =>
  await tenantUrlDataCache.getOrCreate(
    getTenantStaticCacheKey(tenant),
    async () => await buildTenantUrlData(tenant)
  );

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

const buildRuntimeUtilityIndex = async (
  tenant: Tenant
): Promise<UtilityIndex> => {
  const data = await loadTenantUrlData(tenant);
  const pages = await Promise.all(
    resolveLlmPages(data).map(async (page) => {
      if (page.kind === "openapi") {
        return {
          content: formatOpenApiPageContent(page.entry.operation),
          description: page.description,
          slug: page.slug,
          title: page.title,
        };
      }

      const raw = await data.contentSource.readFile(page.relativePath);
      return {
        content: toAgentMarkdown(stripFrontmatter(raw)),
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

export const loadTenantUtilityIndex = async (tenant: Tenant) =>
  await tenantUtilityIndexCache.getOrCreate(
    getTenantStaticCacheKey(tenant),
    async () => {
      const prebuilt = await loadPrebuiltUtilityIndex(
        getTenantContentSource(tenant)
      );
      if (prebuilt) {
        return prebuilt;
      }

      return await buildRuntimeUtilityIndex(tenant);
    }
  );

const loadTenantUtilityTemplate = async (tenant: Tenant, path: string) => {
  const contentSource = getTenantContentSource(tenant);
  try {
    return await contentSource.readFile(path);
  } catch (error) {
    if (isMissingContentFileError(error)) {
      return null;
    }

    throw error;
  }
};

export const clearTenantStaticCaches = () => {
  tenantUrlDataCache.clear();
  tenantUtilityIndexCache.clear();
};

export const clearTenantStaticCachesForTenant = (tenantId: string) => {
  tenantUrlDataCache.deleteByPrefix(tenantId);
  tenantUtilityIndexCache.deleteByPrefix(tenantId);
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
    return await renderUtilityTemplate(prebuilt, tenant, context);
  }

  const { pages } = await loadTenantUtilityIndex(tenant);
  const origin = await getCanonicalOrigin(tenant, context);
  const basePath = await getCanonicalDocBasePath(tenant, context);
  // A publish rewrites every file, so the deployment's publish time is the
  // last-modified date of every page it serves. Older manifests have no such
  // date and a local checkout cannot know one: omit `lastmod` entirely rather
  // than substitute a build or request time, which is the pattern that makes
  // Google ignore `lastmod` sitewide.
  const publishedAt =
    (await getTenantContentSource(tenant).publishedAt?.()) ?? null;
  const lastmod = publishedAt ? `<lastmod>${publishedAt}</lastmod>` : "";
  const urls = pages.map(
    (page) => `${origin}${toDocHref(page.slug, basePath)}`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc>${lastmod}</url>`).join("\n")}
</urlset>`;
};

export const buildTenantRobotsTxt = async (
  tenant: Tenant,
  context: TenantRequestContext = {}
) => {
  const origin = await getCanonicalOrigin(tenant, context);
  const basePath = await getCanonicalDocBasePath(tenant, context);
  return `User-agent: *
Allow: /

# Content-Signal: search=yes, ai-input=yes, ai-train=yes

# LLM-friendly content
# Append .md to any page URL for raw markdown
# ${origin}${toDocHref("llms-full.txt", basePath)} - Full documentation content
# ${origin}${toDocHref("llms.txt", basePath)} - Index of all documentation pages

Sitemap: ${origin}${toDocHref("sitemap.xml", basePath)}

# Agent Skills
# ${origin}${toDocHref(".well-known/skills/index.json", basePath)} - Discover installable agent skills`;
};

const getNavGroupSegments = (
  data: Awaited<ReturnType<typeof loadTenantUrlData>>
): Map<string, Set<string>> => {
  const segments = new Map<string, Set<string>>();
  for (const entry of data.visibleNav) {
    if (entry.type !== "group") {
      continue;
    }
    const group = entry as NavGroup;
    const segmentSlug = slugify(group.title);
    const pageSlugs = new Set(flattenNav([group]).map((page) => page.path));
    if (pageSlugs.size > 0) {
      segments.set(segmentSlug, pageSlugs);
    }
  }
  return segments;
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
    return await renderUtilityTemplate(prebuilt, tenant, context);
  }

  const urlData = await loadTenantUrlData(tenant);
  const data = await loadTenantUtilityIndex(tenant);
  const origin = await getCanonicalOrigin(tenant, context);
  const basePath = await getCanonicalDocBasePath(tenant, context);

  const segments = getNavGroupSegments(urlData);
  const segmentLines =
    segments.size > 0
      ? [
          "",
          "## Segments",
          ...[...segments.keys()].map(
            (seg) =>
              `- [${seg}](${origin}${toDocHref(`llms/${seg}.txt`, basePath)})`
          ),
        ]
      : [];

  const lines = [
    `# ${data.name}`,
    data.description ? `> ${data.description}` : null,
    "",
    `Sitemap: ${origin}${toDocHref("sitemap.xml", basePath)}`,
    `Full content: ${origin}${toDocHref("llms-full.txt", basePath)}`,
    `Skills: ${origin}${toDocHref(".well-known/skills/index.json", basePath)}`,
    ...segmentLines,
    "",
    "## Docs",
    ...data.pages.map((page) => {
      const url = `${origin}${toMarkdownDocHref(page.slug, basePath)}`;
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
  const origin = await getCanonicalOrigin(tenant, context);
  const basePath = await getCanonicalDocBasePath(tenant, context);
  const indexUrl = `${origin}${toDocHref("llms.txt", basePath)}`;

  const prebuilt = await loadTenantUtilityTemplate(
    tenant,
    PREBUILT_UTILITY_LLMS_FULL_PATH
  );
  if (prebuilt) {
    const rendered = await renderUtilityTemplate(prebuilt, tenant, context);
    return capLlmsFullContent(
      prepareLlmsFullContent(rendered, origin, basePath),
      indexUrl
    );
  }

  const data = await loadTenantUtilityIndex(tenant);
  const parts = data.pages.map((page) => {
    const url = `${origin}${toDocHref(page.slug, basePath)}`;
    const content = prepareLlmsFullContent(page.content, origin, basePath);
    return formatMarkdownPageSection(
      page.title,
      url,
      content,
      page.description
    );
  });

  return capLlmsFullContent(parts.join("\n\n"), indexUrl);
};

export const getLlmPageText = async (
  tenant: Tenant,
  slug: string,
  _context: TenantRequestContext = {}
) => {
  const prebuilt = await loadTenantUtilityTemplate(
    tenant,
    getPrebuiltUtilityLlmPagePath(slug)
  );
  if (prebuilt) {
    return prebuilt;
  }

  const data = await loadTenantUtilityIndex(tenant);
  const page = data.pages.find(
    (item) => item.slug === slug || (slug === "index" && item.slug === "")
  );
  if (!page) {
    return null;
  }
  return formatMarkdownPage(
    page.title,
    toAgentMarkdown(page.content),
    page.description
  );
};

export const buildTenantSkillsIndex = async (
  tenant: Tenant,
  _context: TenantRequestContext = {}
) => {
  const data = await loadTenantUrlData(tenant);
  const slug = data.config.slug ?? tenant.slug;
  const description = data.config.description ?? "";

  const skills = [
    {
      description: `${data.config.name} documentation. ${description}`.trim(),
      files: ["SKILL.md"],
      name: slug,
    },
  ];

  return JSON.stringify({ skills }, null, 2);
};

export const buildTenantSkillMd = async (
  tenant: Tenant,
  skillName: string,
  context: TenantRequestContext = {}
) => {
  const data = await loadTenantUrlData(tenant);
  const slug = data.config.slug ?? tenant.slug;

  if (skillName !== slug) {
    return null;
  }

  const origin = await getCanonicalOrigin(tenant, context);
  const basePath = await getCanonicalDocBasePath(tenant, context);
  const description = data.config.description ?? "";

  const lines = [
    "---",
    `name: ${slug}`,
    `description: ${data.config.name} documentation. ${description} Use when working with ${data.config.name}, answering questions about its features, or helping users follow its guides.`.trim(),
    "---",
    "",
    `# ${data.config.name}`,
    "",
    description ? `${description}\n` : "",
    "## Documentation",
    "",
    `- Full docs index: ${origin}${toDocHref("llms.txt", basePath)}`,
    `- Complete docs content: ${origin}${toDocHref("llms-full.txt", basePath)}`,
    `- Append \`.md\` to any page URL for raw markdown`,
    "",
    "## Key Pages",
    "",
    ...resolveLlmPages(data)
      .slice(0, 20)
      .map((page) => {
        const url = `${origin}${toMarkdownDocHref(page.slug, basePath)}`;
        const desc = page.description ? ` - ${page.description}` : "";
        return `- [${page.title}](${url})${desc}`;
      }),
  ];

  return lines.filter((line) => line !== null).join("\n");
};

export const buildTenantLlmsSegment = async (
  tenant: Tenant,
  segmentName: string,
  context: TenantRequestContext = {}
): Promise<string | null> => {
  const prebuilt = await loadTenantUtilityTemplate(
    tenant,
    `${PREBUILT_UTILITY_LLMS_SEGMENT_PREFIX}${segmentName}.txt`
  );
  if (prebuilt) {
    return await renderUtilityTemplate(prebuilt, tenant, context);
  }

  const data = await loadTenantUrlData(tenant);
  const segments = getNavGroupSegments(data);
  const segmentSlugs = segments.get(segmentName);
  if (!segmentSlugs) {
    return null;
  }

  const origin = await getCanonicalOrigin(tenant, context);
  const basePath = await getCanonicalDocBasePath(tenant, context);
  const utilityIndex = await loadTenantUtilityIndex(tenant);

  const segmentPages = utilityIndex.pages.filter((page) =>
    segmentSlugs.has(page.slug)
  );

  if (segmentPages.length === 0) {
    return null;
  }

  const groupTitle =
    [...data.visibleNav].find(
      (entry) => entry.type === "group" && slugify(entry.title) === segmentName
    )?.title ?? segmentName;

  const parts = segmentPages.map((page) => {
    const url = `${origin}${toDocHref(page.slug, basePath)}`;
    const content = prepareLlmsFullContent(page.content, origin, basePath);
    return formatMarkdownPageSection(
      page.title,
      url,
      content,
      page.description
    );
  });

  return [
    `# ${data.config.name} - ${groupTitle}`,
    `> Segment of ${origin}${toDocHref("llms-full.txt", basePath)}`,
    "",
    ...parts,
  ].join("\n\n");
};

export const listTenantLlmsSegments = async (
  tenant: Tenant
): Promise<string[]> => {
  const data = await loadTenantUrlData(tenant);
  return [...getNavGroupSegments(data).keys()];
};

export const getPageJson = async (
  tenant: Tenant,
  slug: string,
  context: TenantRequestContext = {}
): Promise<Record<string, unknown> | null> => {
  const data = await loadTenantUrlData(tenant);
  const contentEntry = data.contentIndex.bySlug.get(slug);
  if (!contentEntry || contentEntry.kind !== "entry") {
    return null;
  }

  const origin = await getCanonicalOrigin(tenant, context);
  const basePath = await getCanonicalDocBasePath(tenant, context);
  const url = `${origin}${toDocHref(slug, basePath)}`;
  const markdownUrl = `${origin}${toMarkdownDocHref(slug, basePath)}`;

  const result: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    description: contentEntry.description,
    name: contentEntry.title,
    url,
  };

  if (contentEntry.frontmatter) {
    const fm = contentEntry.frontmatter as Record<string, unknown>;
    if (fm.price !== undefined && fm.currency !== undefined) {
      result["@type"] = "Product";
      result.offers = {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        price: fm.price,
        priceCurrency: fm.currency,
      };
      if (fm.sku) {
        result.sku = fm.sku;
      }
    }
  }

  result.encoding = {
    "@type": "MediaObject",
    contentUrl: markdownUrl,
    encodingFormat: "text/markdown",
  };

  return result;
};
