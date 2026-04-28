import { slugify } from "@repo/common";
import type { TenantResolution } from "@repo/contracts";
import type { Tenant } from "@repo/models";
import type { UtilityIndex } from "@repo/previewing";
import {
  buildContentIndex,
  buildPageMetadataMap,
  getPrebuiltUtilityLlmPagePath,
  loadContentSource,
  loadPrebuiltContentIndex,
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
import type { NavGroup } from "@/lib/navigation";
import type { OpenApiEntry } from "@/lib/openapi";
import { loadOpenApiRegistry } from "@/lib/openapi";
import { toDocHref, toMarkdownDocHref } from "@/lib/routes";
import { createTimedPromiseCache } from "@/lib/server-cache";
import { getRequestProtocol } from "@/lib/tenancy";
import type { TenantRequestContext } from "@/lib/tenant-utility-context";

const TENANT_STATIC_CACHE_TTL_MS = 30 * 60 * 1000;

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

const buildTenantUrlData = async (tenant: Tenant) => {
  const contentSource = getTenantContentSource(tenant);
  const configResult = await loadSiteConfig(contentSource);
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

const getSchemaTypeLabel = (schema: unknown): string => {
  if (!schema || typeof schema !== "object") {
    return "any";
  }
  const record = schema as Record<string, unknown>;
  if (typeof record.$ref === "string") {
    const last = record.$ref.split("/").pop();
    return last ?? "object";
  }
  if (typeof record.type === "string") {
    if (record.type === "array" && record.items) {
      return `${getSchemaTypeLabel(record.items)}[]`;
    }
    return record.type;
  }
  if (Array.isArray(record.oneOf) || Array.isArray(record.anyOf)) {
    const variants = (record.oneOf ?? record.anyOf) as unknown[];
    return variants.map(getSchemaTypeLabel).join(" | ");
  }
  return "object";
};

const formatParameterLine = (parameter: Record<string, unknown>): string => {
  const name = String(parameter.name ?? "");
  const location = parameter.in ? ` (${parameter.in})` : "";
  const required = parameter.required ? "required" : "optional";
  const type = getSchemaTypeLabel(parameter.schema);
  const description =
    typeof parameter.description === "string" && parameter.description
      ? ` — ${parameter.description.split("\n")[0]}`
      : "";
  return `- \`${name}\`${location}: ${type}, ${required}${description}`;
};

const formatRequestBody = (body: Record<string, unknown>): string => {
  const required = body.required ? "required" : "optional";
  const content = (body.content as Record<string, unknown> | undefined) ?? {};
  const mediaTypes = Object.keys(content);
  if (mediaTypes.length === 0) {
    return `${required} body`;
  }
  return mediaTypes
    .map((mediaType) => {
      const mediaEntry = content[mediaType] as
        | Record<string, unknown>
        | undefined;
      const schemaLabel = getSchemaTypeLabel(mediaEntry?.schema);
      return `- ${mediaType} (${required}): ${schemaLabel}`;
    })
    .join("\n");
};

const formatResponses = (responses: Record<string, unknown>): string =>
  Object.entries(responses)
    .map(([status, value]) => {
      const response = (value as Record<string, unknown>) ?? {};
      const description =
        typeof response.description === "string" && response.description
          ? response.description.split("\n")[0]
          : "";
      const content =
        (response.content as Record<string, unknown> | undefined) ?? {};
      const mediaTypes = Object.keys(content);
      const mediaSuffix = mediaTypes.length
        ? ` [${mediaTypes.join(", ")}]`
        : "";
      return `- ${status}${mediaSuffix}${description ? ` — ${description}` : ""}`;
    })
    .join("\n");

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
      `## Parameters\n\n${entry.operation.parameters
        .map(formatParameterLine)
        .join("\n")}`
    );
  }
  if (entry.operation.requestBody) {
    parts.push(
      `## Request body\n\n${formatRequestBody(entry.operation.requestBody)}`
    );
  }
  if (entry.operation.responses) {
    parts.push(`## Responses\n\n${formatResponses(entry.operation.responses)}`);
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
const LEADING_H1_REGEX = /^#\s+([^\r\n]+)(?:\r?\n(?:\r?\n)?)?/;

const PLACEHOLDER_URL_PATTERN = [
  "https?://(?:[a-z0-9-]+\\.)*example\\.(?:com|org|net)\\b[^\\s)\\]\"'<>]*",
  "https?://discord\\.gg/example\\b[^\\s)\\]\"'<>]*",
  "https?://(?:[a-z0-9-]+\\.)+(?:test|invalid)(?:[/?#:][^\\s)\\]\"'<>]*)?",
  "https?://localhost(?::\\d+)?[^\\s)\\]\"'<>]*",
  "https?://(?:[a-z0-9-]+\\.)*your[-_]?domain\\.[a-z]+\\b[^\\s)\\]\"'<>]*",
  "https?://acme\\.blode\\.md\\b[^\\s)\\]\"'<>]*",
  "https?://github\\.com/example/[^\\s)\\]\"'<>]*",
].join("|");
const PLACEHOLDER_URL_RE = new RegExp(PLACEHOLDER_URL_PATTERN, "gi");
const PLACEHOLDER_MARKDOWN_LINK_RE = new RegExp(
  `\\[([^\\]]+)\\]\\((?:${PLACEHOLDER_URL_PATTERN})\\)`,
  "gi"
);

export const sanitizePlaceholderUrls = (text: string): string =>
  text
    .replace(PLACEHOLDER_MARKDOWN_LINK_RE, "$1")
    .replace(PLACEHOLDER_URL_RE, (match) => `\`${match}\``);

const INTERNAL_MARKDOWN_LINK_RE = /(\[[^\]]+\])\((\/[^)\s]*)\)/g;

export const absolutiseInternalLinks = (
  source: string,
  origin: string,
  basePath: string
): string => {
  const normalizedBase = basePath
    ? `/${basePath}`.replaceAll(/\/+/g, "/").replace(/\/$/, "")
    : "";
  return source.replace(INTERNAL_MARKDOWN_LINK_RE, (_match, label, path) => {
    const alreadyPrefixed =
      normalizedBase &&
      (path === normalizedBase || path.startsWith(`${normalizedBase}/`));
    const absolutePath = alreadyPrefixed
      ? path
      : `${normalizedBase}${path}`.replaceAll(/\/+/g, "/");
    return `${label}(${origin}${absolutePath})`;
  });
};

const stripFrontmatter = (source: string) =>
  source.replace(FRONTMATTER_REGEX, "").trim();

const stripMatchingLeadingH1 = (source: string, title: string) => {
  const trimmed = source.trimStart();
  const match = LEADING_H1_REGEX.exec(trimmed);
  if (!match) {
    return trimmed.trim();
  }

  const [headingLine = "", headingTitle = ""] = match;
  if (slugify(headingTitle) !== slugify(title)) {
    return trimmed.trim();
  }

  return trimmed.slice(headingLine.length).trim();
};

const formatMarkdownPage = (title: string, source: string) => {
  const content = stripMatchingLeadingH1(source, title);
  if (!content) {
    return `# ${title}`;
  }

  return `# ${title}\n\n${content}`;
};

const formatMarkdownPageSection = (
  title: string,
  url: string,
  source: string
) => {
  const content = stripMatchingLeadingH1(source, title);
  if (!content) {
    return `# ${title} (${url})`;
  }

  return `# ${title} (${url})\n\n${content}`;
};

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
Content-Signal: ai-train=no, search=yes, ai-input=yes

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
    return renderUtilityTemplate(prebuilt, tenant, context);
  }

  const urlData = await loadTenantUrlData(tenant);
  const data = await loadTenantUtilityIndex(tenant);
  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);

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
  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);

  const prebuilt = await loadTenantUtilityTemplate(
    tenant,
    PREBUILT_UTILITY_LLMS_FULL_PATH
  );
  if (prebuilt) {
    const rendered = renderUtilityTemplate(prebuilt, tenant, context);
    return absolutiseInternalLinks(
      sanitizePlaceholderUrls(rendered),
      origin,
      basePath
    );
  }

  const data = await loadTenantUtilityIndex(tenant);
  const parts = data.pages.map((page) => {
    const url = `${origin}${toDocHref(page.slug, basePath)}`;
    const cleaned = sanitizePlaceholderUrls(page.content);
    const absolute = absolutiseInternalLinks(cleaned, origin, basePath);
    return formatMarkdownPageSection(page.title, url, absolute);
  });

  return parts.join("\n\n");
};

export const getLlmPageText = async (
  tenant: Tenant,
  slug: string,
  context: TenantRequestContext = {}
) => {
  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);

  const prebuilt = await loadTenantUtilityTemplate(
    tenant,
    getPrebuiltUtilityLlmPagePath(slug)
  );
  if (prebuilt) {
    return absolutiseInternalLinks(
      sanitizePlaceholderUrls(prebuilt),
      origin,
      basePath
    );
  }

  const data = await loadTenantUtilityIndex(tenant);
  const page = data.pages.find(
    (item) => item.slug === slug || (slug === "index" && item.slug === "")
  );
  if (!page) {
    return null;
  }
  return absolutiseInternalLinks(
    sanitizePlaceholderUrls(formatMarkdownPage(page.title, page.content)),
    origin,
    basePath
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

  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);
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
  const data = await loadTenantUrlData(tenant);
  const segments = getNavGroupSegments(data);
  const segmentSlugs = segments.get(segmentName);
  if (!segmentSlugs) {
    return null;
  }

  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);
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
    const cleaned = sanitizePlaceholderUrls(page.content);
    const absolute = absolutiseInternalLinks(cleaned, origin, basePath);
    return formatMarkdownPageSection(page.title, url, absolute);
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

  const origin = getCanonicalOrigin(tenant, context);
  const basePath = getCanonicalDocBasePath(tenant, context);
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
