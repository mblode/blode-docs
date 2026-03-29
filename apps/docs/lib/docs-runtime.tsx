import { normalizePath } from "@repo/common";
import type { Tenant } from "@repo/models";
import {
  buildContentIndex,
  buildPageMetadataMap,
  loadContentSource,
  loadSiteConfig,
} from "@repo/previewing";
import type {
  ContentIndex,
  ContentSource,
  PageMetadata,
} from "@repo/previewing";
import { cache } from "react";

import { ApiReference } from "@/components/api/api-reference";
import {
  getTenantContentSource,
  resolveSiteConfigAssets,
} from "@/lib/content-source";
import {
  getDocsCollection,
  getDocsCollectionWithNavigation,
  getDocsNavigation,
} from "@/lib/docs-collection";
import { renderMdx } from "@/lib/mdx";
import {
  buildNavigation,
  buildTabbedNavigation,
  enrichNavWithMetadata,
  findActiveTabIndex,
  findBreadcrumbs,
  flattenNav,
  getVisibleNavigation,
} from "@/lib/navigation";
import type { NavEntry, NavPage, NavTab } from "@/lib/navigation";
import { buildOpenApiRegistry } from "@/lib/openapi";
import type { OpenApiRegistry } from "@/lib/openapi";
import { createTimedPromiseCache } from "@/lib/server-cache";
import { getTenantBySlug } from "@/lib/tenants";
import { extractToc } from "@/lib/toc";

interface SearchItem {
  href?: string;
  title: string;
  path: string;
}

interface ConfigErrorResult {
  configErrors: string[];
  configWarnings: string[];
  tenant: Tenant;
}

interface RenderedPageData {
  content: Awaited<ReturnType<typeof renderMdx>>["content"];
  frontmatter: Awaited<ReturnType<typeof renderMdx>>["frontmatter"];
  rawContent: string;
  toc: ReturnType<typeof extractToc>;
}

interface TenantArtifacts {
  anchors: { label: string; href: string }[];
  config: Awaited<ReturnType<typeof resolveSiteConfigAssets>>;
  contentIndex: ContentIndex;
  contentSource: ContentSource;
  flatNav: NavPage[];
  pageMetadataMap: Map<string, PageMetadata>;
  registry: OpenApiRegistry;
  searchItems: SearchItem[];
  tabs: NavTab[] | null;
  tenant: Tenant;
  visibleFlatNav: NavPage[];
  visibleNav: NavEntry[];
}

type TenantArtifactsResult = ConfigErrorResult | TenantArtifacts | null;

const ARTIFACT_CACHE_TTL_MS = 5 * 60 * 1000;
const PAGE_RENDER_CACHE_TTL_MS = 15 * 60 * 1000;

const artifactsCache = createTimedPromiseCache<string, TenantArtifactsResult>({
  maxEntries: 32,
  ttlMs: ARTIFACT_CACHE_TTL_MS,
});

const renderedPageCache = createTimedPromiseCache<string, RenderedPageData>({
  maxEntries: 256,
  ttlMs: PAGE_RENDER_CACHE_TTL_MS,
});

const isConfigErrorResult = (
  value: TenantArtifactsResult
): value is ConfigErrorResult => Boolean(value && "configErrors" in value);

const getTenantArtifactsCacheKey = (tenant: Tenant) =>
  [
    tenant.id,
    tenant.slug,
    tenant.activeDeploymentId ?? "",
    tenant.activeDeploymentManifestUrl ?? "",
    tenant.docsPath ?? "",
    tenant.pathPrefix ?? "",
    tenant.primaryDomain,
  ].join(":");

const buildSearchItems = ({
  contentIndex,
  flatNav,
  pageMetadataMap,
  visibleFlatNav,
  config,
}: {
  config: TenantArtifacts["config"];
  contentIndex: ContentIndex;
  flatNav: NavPage[];
  pageMetadataMap: Map<string, PageMetadata>;
  visibleFlatNav: NavPage[];
}): SearchItem[] => {
  const indexAll = config.seo?.indexing === "all";
  const searchItems = new Map<string, SearchItem>();

  const shouldAddSearchItem = (
    entry: (typeof contentIndex.entries)[number]
  ): boolean => {
    const pageMeta = pageMetadataMap.get(entry.slug);

    if (pageMeta?.hidden || pageMeta?.noindex) {
      return false;
    }

    if (!indexAll && entry.kind === "entry" && entry.hidden) {
      return false;
    }

    return true;
  };

  for (const item of visibleFlatNav) {
    searchItems.set(item.path, {
      href: item.url,
      path: item.path,
      title: item.sidebarTitle ?? item.title,
    });
  }

  for (const entry of contentIndex.entries) {
    if (!shouldAddSearchItem(entry)) {
      continue;
    }

    const pageMeta = pageMetadataMap.get(entry.slug);
    searchItems.set(entry.slug, {
      href: pageMeta?.url,
      path: entry.slug,
      title: pageMeta?.sidebarTitle ?? entry.title,
    });
  }

  if (indexAll) {
    for (const item of flatNav) {
      if (!searchItems.has(item.path)) {
        searchItems.set(item.path, {
          href: item.url,
          path: item.path,
          title: item.sidebarTitle ?? item.title,
        });
      }
    }
  }

  return [...searchItems.values()];
};

const getTenantArtifacts = async (tenantSlug: string) => {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return null;
  }

  const cacheKey = getTenantArtifactsCacheKey(tenant);

  return await artifactsCache.getOrCreate(cacheKey, async () => {
    const contentSource = getTenantContentSource(tenant);
    const configResult = await loadSiteConfig(contentSource);
    if (!configResult.ok) {
      return {
        configErrors: configResult.errors,
        configWarnings: [],
        tenant,
      };
    }

    const config = await resolveSiteConfigAssets(
      configResult.config,
      contentSource
    );
    const docsCollection = getDocsCollection(config);
    const docsNavigation = getDocsNavigation(config);
    const docsCollectionWithNavigation =
      getDocsCollectionWithNavigation(config);

    const [contentIndex, registryResult] = await Promise.all([
      buildContentIndex(contentSource, config),
      buildOpenApiRegistry(docsCollectionWithNavigation, contentSource)
        .then((registry) => ({ ok: true as const, registry }))
        .catch((error: unknown) => ({
          error,
          ok: false as const,
        })),
    ]);

    if (contentIndex.errors.length) {
      return {
        configErrors: contentIndex.errors,
        configWarnings: configResult.warnings,
        tenant,
      };
    }

    if (!registryResult.ok) {
      return {
        configErrors: [
          registryResult.error instanceof Error
            ? registryResult.error.message
            : "OpenAPI parsing failed",
        ],
        configWarnings: configResult.warnings,
        tenant,
      };
    }

    const pageMetadataMap = buildPageMetadataMap(contentIndex);
    const slugPrefix = docsCollection?.slugPrefix ?? "";
    const rawNav = docsNavigation
      ? buildNavigation(docsNavigation, registryResult.registry, slugPrefix)
      : [];
    const nav = enrichNavWithMetadata(rawNav, pageMetadataMap);
    const visibleNav = getVisibleNavigation(nav);
    const flatNav = flattenNav(nav);
    const visibleFlatNav = flattenNav(visibleNav);
    const rawTabs = buildTabbedNavigation(
      docsNavigation,
      registryResult.registry,
      slugPrefix
    );
    const tabs =
      rawTabs?.map((tab) => ({
        ...tab,
        entries: enrichNavWithMetadata(tab.entries, pageMetadataMap),
      })) ?? null;

    return {
      anchors: docsNavigation?.global?.anchors ?? [],
      config,
      contentIndex,
      contentSource,
      flatNav,
      pageMetadataMap,
      registry: registryResult.registry,
      searchItems: buildSearchItems({
        config,
        contentIndex,
        flatNav,
        pageMetadataMap,
        visibleFlatNav,
      }),
      tabs,
      tenant,
      visibleFlatNav,
      visibleNav,
    };
  });
};

export const getTenantSearchItems = cache(async (tenantSlug: string) => {
  const artifacts = await getTenantArtifacts(tenantSlug);
  if (!artifacts || isConfigErrorResult(artifacts)) {
    return null;
  }

  return artifacts.searchItems;
});

const getRenderedPageData = async ({
  artifacts,
  currentPath,
  relativePath,
  useToc,
}: {
  artifacts: TenantArtifacts;
  currentPath: string;
  relativePath: string;
  useToc: boolean;
}) => {
  const cacheKey = `${getTenantArtifactsCacheKey(artifacts.tenant)}:${currentPath}`;

  return await renderedPageCache.getOrCreate(cacheKey, async () => {
    const rawContent = await loadContentSource(
      artifacts.contentSource,
      relativePath
    );
    const { content, frontmatter } = await renderMdx(rawContent);

    return {
      content,
      frontmatter,
      rawContent,
      toc: useToc ? extractToc(rawContent) : [],
    };
  });
};

export const clearDocsRuntimeCaches = () => {
  artifactsCache.clear();
  renderedPageCache.clear();
};

// oxlint-disable-next-line eslint/complexity
export const getDocData = cache(async (tenantSlug: string, slugKey: string) => {
  const artifacts = await getTenantArtifacts(tenantSlug);
  if (!artifacts || isConfigErrorResult(artifacts)) {
    return artifacts;
  }

  const currentPath = normalizePath(slugKey) || "index";
  const activeTabIndex = artifacts.tabs
    ? findActiveTabIndex(artifacts.tabs, currentPath)
    : 0;
  const activeTabNav = artifacts.tabs
    ? getVisibleNavigation(artifacts.tabs[activeTabIndex]?.entries ?? [])
    : null;
  const activeTabFlatNav = activeTabNav ? flattenNav(activeTabNav) : null;
  const openApiEntry = artifacts.registry.bySlug.get(currentPath);

  if (openApiEntry) {
    const isHidden = artifacts.flatNav.some(
      (page) => page.path === currentPath && page.hidden
    );

    return {
      activeTabIndex,
      anchors: artifacts.anchors,
      breadcrumbs: findBreadcrumbs(
        activeTabNav ?? artifacts.visibleNav,
        currentPath
      ),
      config: artifacts.config,
      content: (
        <ApiReference
          entry={openApiEntry}
          proxyEnabled={artifacts.config.openapiProxy?.enabled ?? false}
        />
      ),
      currentPath,
      deprecated: false,
      flatNav: activeTabFlatNav ?? artifacts.visibleFlatNav,
      hidden: isHidden,
      hideFooterPagination: false,
      mode: undefined,
      nav: activeTabNav ?? artifacts.visibleNav,
      noindex: false,
      pageDescription: openApiEntry.operation.description,
      pageTitle: openApiEntry.operation.summary ?? openApiEntry.identifier,
      rawContent: openApiEntry.operation.description ?? "",
      tabs: artifacts.tabs,
      tenant: artifacts.tenant,
      toc: [],
    };
  }

  const entry = artifacts.contentIndex.bySlug.get(currentPath) ?? null;
  if (!entry) {
    return null;
  }

  if (entry.kind === "index") {
    const collectionEntries =
      artifacts.contentIndex.byCollection
        .get(entry.collectionId)
        ?.filter(
          (
            collectionEntry
          ): collectionEntry is Extract<
            (typeof artifacts.contentIndex.entries)[number],
            { kind: "entry" }
          > =>
            collectionEntry.kind === "entry" &&
            collectionEntry.hidden !== true &&
            !artifacts.pageMetadataMap.get(collectionEntry.slug)?.hidden &&
            !artifacts.pageMetadataMap.get(collectionEntry.slug)?.noindex
        ) ?? [];
    const showDocsNav = entry.type === "docs";

    return {
      activeTabIndex,
      anchors: showDocsNav ? artifacts.anchors : [],
      breadcrumbs: [],
      collectionIndex: {
        entries: collectionEntries,
      },
      config: artifacts.config,
      content: null,
      currentPath,
      deprecated: false,
      flatNav: activeTabFlatNav ?? artifacts.visibleFlatNav,
      hidden: false,
      hideFooterPagination: false,
      mode: undefined,
      nav: showDocsNav ? (activeTabNav ?? artifacts.visibleNav) : [],
      noindex: false,
      pageDescription: entry.description,
      pageTitle: entry.title,
      tabs: artifacts.tabs,
      tenant: artifacts.tenant,
      toc: [],
    };
  }

  const useToc =
    entry.type === "docs" && artifacts.config.features?.toc !== false;
  const renderedPage = await getRenderedPageData({
    artifacts,
    currentPath,
    relativePath: entry.relativePath,
    useToc,
  });
  const pageTitle =
    (renderedPage.frontmatter?.title as string | undefined) ?? entry.title;
  const pageDescription =
    (renderedPage.frontmatter?.description as string | undefined) ??
    entry.description;
  const showDocsNav = entry.type === "docs";
  const breadcrumbs = showDocsNav
    ? findBreadcrumbs(activeTabNav ?? artifacts.visibleNav, currentPath)
    : [];
  const isHiddenByFrontmatter = renderedPage.frontmatter?.hidden === true;
  const isHiddenByNav = artifacts.flatNav.some(
    (page) => page.path === currentPath && page.hidden
  );
  const isHidden =
    isHiddenByFrontmatter || isHiddenByNav || entry.hidden === true;
  const pageMeta = artifacts.pageMetadataMap.get(currentPath);

  return {
    activeTabIndex,
    anchors: showDocsNav ? artifacts.anchors : [],
    breadcrumbs,
    config: artifacts.config,
    content: renderedPage.content,
    currentPath,
    deprecated: pageMeta?.deprecated ?? false,
    flatNav: activeTabFlatNav ?? artifacts.visibleFlatNav,
    hidden: isHidden,
    hideFooterPagination: pageMeta?.hideFooterPagination ?? false,
    mode: pageMeta?.mode,
    nav: showDocsNav ? (activeTabNav ?? artifacts.visibleNav) : [],
    noindex: pageMeta?.noindex ?? false,
    pageDescription,
    pageTitle,
    rawContent: renderedPage.rawContent,
    tabs: artifacts.tabs,
    tenant: artifacts.tenant,
    toc: renderedPage.toc,
  };
});
