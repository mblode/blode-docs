import { normalizePath } from "@repo/common";
import type { PageMode, Tenant } from "@repo/models";
import {
  buildContentIndex,
  buildPageMetadataMap,
  buildSearchIndex,
  buildUtilityIndex,
  loadContentSource,
  loadPrebuiltContentIndex,
  loadPrebuiltSearchIndex,
  loadPrebuiltTocIndex,
  loadPrebuiltUtilityIndex,
  loadSiteConfig,
} from "@repo/previewing";
import type {
  ContentIndex,
  ContentSource,
  PageMetadata,
  SearchIndexItem,
  TocItem,
  UtilityIndex,
} from "@repo/previewing";
import { cache } from "react";

import {
  getTenantContentSource,
  resolveSiteConfigAssets,
} from "@/lib/content-source";
import { contextualOptionsRequirePageContent } from "@/lib/contextual-options";
import {
  getDocsCollection,
  getDocsCollectionWithNavigation,
  getDocsNavigation,
} from "@/lib/docs-collection";
import { renderFromCompiled, renderMdx } from "@/lib/mdx";
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
import { loadOpenApiRegistry } from "@/lib/openapi";
import type { OpenApiRegistry } from "@/lib/openapi";
import { createTimedPromiseCache } from "@/lib/server-cache";
import { getTenantBySlug } from "@/lib/tenants";
import { extractToc } from "@/lib/toc";

interface ConfigErrorResult {
  configErrors: string[];
  configWarnings: string[];
  tenant: Tenant;
}

interface UnpublishedTenantResult {
  emptyState: "unpublished";
  tenant: Tenant;
}

interface RenderedPageData {
  content: Awaited<ReturnType<typeof renderMdx>>["content"];
  frontmatter: Awaited<ReturnType<typeof renderMdx>>["frontmatter"];
  rawContent?: string;
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
  tabs: NavTab[] | null;
  tenant: Tenant;
  tocBySlug: Map<string, TocItem[]>;
  visibleFlatNav: NavPage[];
  visibleNav: NavEntry[];
}

type TenantArtifactsResult =
  | ConfigErrorResult
  | TenantArtifacts
  | UnpublishedTenantResult
  | null;

const ARTIFACT_CACHE_TTL_MS = 30 * 60 * 1000;
const PAGE_RENDER_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

const artifactsCache = createTimedPromiseCache<string, TenantArtifactsResult>({
  maxEntries: 512,
  ttlMs: ARTIFACT_CACHE_TTL_MS,
});

const searchItemsCache = createTimedPromiseCache<string, SearchIndexItem[]>({
  maxEntries: 512,
  ttlMs: ARTIFACT_CACHE_TTL_MS,
});

const renderedPageCache = createTimedPromiseCache<string, RenderedPageData>({
  maxEntries: 2048,
  ttlMs: PAGE_RENDER_CACHE_TTL_MS,
});

const isConfigErrorResult = (
  value: TenantArtifactsResult
): value is ConfigErrorResult => Boolean(value && "configErrors" in value);

const isUnpublishedTenantResult = (
  value: TenantArtifactsResult
): value is UnpublishedTenantResult => Boolean(value && "emptyState" in value);

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
  config,
  contentIndex,
  utilityIndex,
}: {
  config: TenantArtifacts["config"];
  contentIndex: ContentIndex;
  utilityIndex?: UtilityIndex | null;
}) => buildSearchIndex(contentIndex, config, utilityIndex ?? undefined);

const mergeSearchItems = ({
  baseItems,
  config,
  flatNav,
  visibleFlatNav,
}: {
  baseItems: SearchIndexItem[];
  config: TenantArtifacts["config"];
  flatNav: NavPage[];
  visibleFlatNav: NavPage[];
}): SearchIndexItem[] => {
  const items = new Map<string, SearchIndexItem>(
    baseItems.map((item) => [item.path, item])
  );

  for (const item of visibleFlatNav) {
    items.set(item.path, {
      href: item.url,
      path: item.path,
      title: item.sidebarTitle ?? item.title,
    });
  }

  if (config.seo?.indexing === "all") {
    for (const item of flatNav) {
      if (!items.has(item.path)) {
        items.set(item.path, {
          href: item.url,
          path: item.path,
          title: item.sidebarTitle ?? item.title,
        });
      }
    }
  }

  return [...items.values()];
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
      if (
        !tenant.activeDeploymentManifestUrl &&
        configResult.errors.length === 1 &&
        configResult.errors[0] === "docs.json not found."
      ) {
        return {
          emptyState: "unpublished" as const,
          tenant,
        };
      }

      return {
        configErrors: configResult.errors,
        configWarnings: [],
        tenant,
      };
    }

    const rawConfig = configResult.config;
    const docsCollection = getDocsCollection(rawConfig);
    const docsNavigation = getDocsNavigation(rawConfig);
    const docsCollectionWithNavigation =
      getDocsCollectionWithNavigation(rawConfig);

    const [config, contentIndex, registryResult, prebuiltTocIndex] =
      await Promise.all([
        resolveSiteConfigAssets(rawConfig, contentSource),
        loadPrebuiltContentIndex(contentSource).then(
          async (prebuilt) =>
            prebuilt ?? (await buildContentIndex(contentSource, rawConfig))
        ),
        loadOpenApiRegistry(docsCollectionWithNavigation, contentSource)
          .then((registry) => ({ ok: true as const, registry }))
          .catch((error: unknown) => ({
            error,
            ok: false as const,
          })),
        loadPrebuiltTocIndex(contentSource),
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
      tabs,
      tenant,
      tocBySlug: prebuiltTocIndex ?? new Map(),
      visibleFlatNav,
      visibleNav,
    };
  });
};

export const getTenantSearchItems = cache(async (tenantSlug: string) => {
  const artifacts = await getTenantArtifacts(tenantSlug);
  if (
    !artifacts ||
    isConfigErrorResult(artifacts) ||
    isUnpublishedTenantResult(artifacts)
  ) {
    return null;
  }

  const cacheKey = `${getTenantArtifactsCacheKey(artifacts.tenant)}:search`;

  return await searchItemsCache.getOrCreate(cacheKey, async () => {
    const prebuiltSearchIndex = await loadPrebuiltSearchIndex(
      artifacts.contentSource
    );
    const utilityIndex = prebuiltSearchIndex
      ? null
      : ((await loadPrebuiltUtilityIndex(artifacts.contentSource)) ??
        (await buildUtilityIndex(
          artifacts.contentIndex,
          artifacts.contentSource,
          artifacts.config
        )));

    return mergeSearchItems({
      baseItems:
        prebuiltSearchIndex ??
        buildSearchItems({
          config: artifacts.config,
          contentIndex: artifacts.contentIndex,
          utilityIndex,
        }),
      config: artifacts.config,
      flatNav: artifacts.flatNav,
      visibleFlatNav: artifacts.visibleFlatNav,
    });
  });
});

const getRenderedPageData = async ({
  artifacts,
  currentPath,
  relativePath,
  rawContent: preloadedRawContent,
  toc: preloadedToc,
  useToc,
}: {
  artifacts: TenantArtifacts;
  currentPath: string;
  relativePath: string;
  rawContent?: string;
  toc?: TocItem[];
  useToc: boolean;
}) => {
  const cacheKey = `${getTenantArtifactsCacheKey(artifacts.tenant)}:${currentPath}`;

  return await renderedPageCache.getOrCreate(cacheKey, async () => {
    const compiled =
      await artifacts.contentSource.readCompiledMdx?.(relativePath);
    const rawContent =
      preloadedRawContent ??
      (compiled
        ? undefined
        : await loadContentSource(artifacts.contentSource, relativePath));
    const rendered = compiled
      ? await renderFromCompiled(compiled.compiledSource)
      : await renderMdx(rawContent ?? "");

    return {
      content: rendered.content,
      frontmatter: rendered.frontmatter,
      rawContent,
      toc: preloadedToc ?? (useToc && rawContent ? extractToc(rawContent) : []),
    };
  });
};

export const clearDocsRuntimeCaches = () => {
  artifactsCache.clear();
  searchItemsCache.clear();
  renderedPageCache.clear();
};

export const clearDocsRuntimeCachesForTenant = (tenantId: string) => {
  artifactsCache.deleteByPrefix(tenantId);
  searchItemsCache.deleteByPrefix(tenantId);
  renderedPageCache.deleteByPrefix(tenantId);
};

const computePrevNext = (
  flatNav: NavPage[],
  currentPath: string
): {
  nextPage: { title: string; path: string } | undefined;
  prevPage: { title: string; path: string } | undefined;
} => {
  const currentIndex = flatNav.findIndex((p) => p.path === currentPath);
  return {
    nextPage:
      currentIndex !== -1 && currentIndex < flatNav.length - 1
        ? flatNav[currentIndex + 1]
        : undefined,
    prevPage: currentIndex > 0 ? flatNav[currentIndex - 1] : undefined,
  };
};

/**
 * Returns shell data (config, nav, title, breadcrumbs) from cached artifacts
 * without compiling MDX. Used by the page component to render the shell
 * immediately while streaming content.
 */
export const getDocShellData = cache(
  // oxlint-disable-next-line eslint/complexity
  async (tenantSlug: string, slugKey: string) => {
    const artifacts = await getTenantArtifacts(tenantSlug);
    if (
      !artifacts ||
      isConfigErrorResult(artifacts) ||
      isUnpublishedTenantResult(artifacts)
    ) {
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
    const effectiveFlatNav = activeTabFlatNav ?? artifacts.visibleFlatNav;

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
        currentPath,
        deprecated: false,
        hidden: isHidden,
        hideFooterPagination: false,
        kind: "openapi" as const,
        mode: undefined as PageMode | undefined,
        nav: activeTabNav ?? artifacts.visibleNav,
        nextPage: computePrevNext(effectiveFlatNav, currentPath).nextPage,
        noindex: false,
        openApiEntry,
        openapiProxyEnabled: artifacts.config.openapiProxy?.enabled ?? false,
        pageDescription: openApiEntry.operation.description,
        pageTitle: openApiEntry.operation.summary ?? openApiEntry.identifier,
        prevPage: computePrevNext(effectiveFlatNav, currentPath).prevPage,
        tabs: artifacts.tabs,
        tenant: artifacts.tenant,
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
        breadcrumbs: [] as { label: string; path: string }[],
        collectionIndex: { entries: collectionEntries },
        config: artifacts.config,
        currentPath,
        deprecated: false,
        hidden: false,
        hideFooterPagination: false,
        kind: "index" as const,
        mode: undefined as PageMode | undefined,
        nav: showDocsNav ? (activeTabNav ?? artifacts.visibleNav) : [],
        nextPage: computePrevNext(effectiveFlatNav, currentPath).nextPage,
        noindex: false,
        pageDescription: entry.description,
        pageTitle: entry.title,
        prevPage: computePrevNext(effectiveFlatNav, currentPath).prevPage,
        tabs: artifacts.tabs,
        tenant: artifacts.tenant,
      };
    }

    const showDocsNav = entry.type === "docs";
    const breadcrumbs = showDocsNav
      ? findBreadcrumbs(activeTabNav ?? artifacts.visibleNav, currentPath)
      : [];
    const pageMeta = artifacts.pageMetadataMap.get(currentPath);
    const isHiddenByNav = artifacts.flatNav.some(
      (page) => page.path === currentPath && page.hidden
    );
    const { nextPage, prevPage } = computePrevNext(
      effectiveFlatNav,
      currentPath
    );
    const useToc =
      entry.type === "docs" && artifacts.config.features?.toc !== false;

    const prebuiltToc = artifacts.tocBySlug.get(currentPath) ?? null;
    const needsRawContent = artifacts.config.contextual
      ? contextualOptionsRequirePageContent(artifacts.config.contextual.options)
      : false;

    let rawContent: string | undefined;
    let toc: ReturnType<typeof extractToc> = prebuiltToc ?? [];
    if ((!prebuiltToc && useToc) || needsRawContent) {
      try {
        rawContent = await loadContentSource(
          artifacts.contentSource,
          entry.relativePath
        );
        if (!prebuiltToc && useToc) {
          toc = extractToc(rawContent);
        }
      } catch {
        // Content load failure is handled by the content rendering path
      }
    }

    return {
      activeTabIndex,
      anchors: showDocsNav ? artifacts.anchors : [],
      breadcrumbs,
      config: artifacts.config,
      currentPath,
      deprecated: pageMeta?.deprecated ?? false,
      hidden: isHiddenByNav || entry.hidden === true,
      hideFooterPagination: pageMeta?.hideFooterPagination ?? false,
      kind: "page" as const,
      mode: pageMeta?.mode,
      nav: showDocsNav ? (activeTabNav ?? artifacts.visibleNav) : [],
      nextPage,
      noindex: pageMeta?.noindex ?? false,
      pageDescription: entry.description,
      pageTitle: entry.title,
      prevPage,
      rawContent,
      tabs: artifacts.tabs,
      tenant: artifacts.tenant,
      toc,
    };
  }
);

/**
 * Compiles MDX content for a specific page. Uses pre-compiled content
 * from deploy when available, otherwise falls back to runtime compilation.
 */
export const getDocPageContent = cache(
  async (
    tenantSlug: string,
    slugKey: string,
    rawContent?: string,
    toc?: TocItem[]
  ) => {
    const artifacts = await getTenantArtifacts(tenantSlug);
    if (
      !artifacts ||
      isConfigErrorResult(artifacts) ||
      isUnpublishedTenantResult(artifacts)
    ) {
      return null;
    }

    const currentPath = normalizePath(slugKey) || "index";
    const entry = artifacts.contentIndex.bySlug.get(currentPath) ?? null;
    if (!entry || entry.kind !== "entry") {
      return null;
    }

    const useToc =
      entry.type === "docs" && artifacts.config.features?.toc !== false;

    return await getRenderedPageData({
      artifacts,
      currentPath,
      rawContent,
      relativePath: entry.relativePath,
      toc,
      useToc,
    });
  }
);
