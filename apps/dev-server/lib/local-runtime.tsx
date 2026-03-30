import { createPreviewContentSource } from "@dev/lib/local-content-source";
import { normalizePath } from "@repo/common";
import type { PageMode, SiteConfig } from "@repo/models";
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
import { extractToc } from "@/lib/toc";

interface SearchItem {
  href?: string;
  path: string;
  title: string;
}

interface ConfigErrorResult {
  configErrors: string[];
  configWarnings: string[];
}

interface RenderedPageData {
  content: Awaited<ReturnType<typeof renderMdx>>["content"];
  frontmatter: Awaited<ReturnType<typeof renderMdx>>["frontmatter"];
  rawContent: string;
  toc: ReturnType<typeof extractToc>;
}

interface PreviewArtifacts {
  anchors: { href: string; label: string }[];
  config: SiteConfig;
  contentIndex: ContentIndex;
  contentSource: ContentSource;
  flatNav: NavPage[];
  pageMetadataMap: Map<string, PageMetadata>;
  registry: OpenApiRegistry;
  searchItems: SearchItem[];
  tabs: NavTab[] | null;
  visibleFlatNav: NavPage[];
  visibleNav: NavEntry[];
}

type PreviewArtifactsResult = ConfigErrorResult | PreviewArtifacts | null;

const ARTIFACT_CACHE_TTL_MS = 5 * 60 * 1000;
const PAGE_RENDER_CACHE_TTL_MS = 5 * 60 * 1000;
const USE_LOCAL_RUNTIME_CACHE = false;

const artifactsCache = createTimedPromiseCache<string, PreviewArtifactsResult>({
  maxEntries: 32,
  ttlMs: ARTIFACT_CACHE_TTL_MS,
});

const renderedPageCache = createTimedPromiseCache<string, RenderedPageData>({
  maxEntries: 512,
  ttlMs: PAGE_RENDER_CACHE_TTL_MS,
});

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const isConfigErrorResult = (
  value: PreviewArtifactsResult
): value is ConfigErrorResult => Boolean(value && "configErrors" in value);

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

const resolveSiteConfigAssets = async (
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

const buildSearchItems = ({
  config,
  contentIndex,
  flatNav,
  pageMetadataMap,
  visibleFlatNav,
}: {
  config: SiteConfig;
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

const buildArtifacts = async (): Promise<PreviewArtifactsResult> => {
  const contentSource = createPreviewContentSource();
  const configResult = await loadSiteConfig(contentSource);

  if (!configResult.ok) {
    return {
      configErrors: configResult.errors,
      configWarnings: [],
    };
  }

  const rawConfig = configResult.config;
  const docsCollection = getDocsCollection(rawConfig);
  const docsNavigation = getDocsNavigation(rawConfig);
  const docsCollectionWithNavigation =
    getDocsCollectionWithNavigation(rawConfig);

  const [config, contentIndex, registryResult] = await Promise.all([
    resolveSiteConfigAssets(rawConfig, contentSource),
    buildContentIndex(contentSource, rawConfig),
    buildOpenApiRegistry(docsCollectionWithNavigation, contentSource)
      .then((registry) => ({ ok: true as const, registry }))
      .catch((error: unknown) => ({ error, ok: false as const })),
  ]);

  if (contentIndex.errors.length) {
    return {
      configErrors: contentIndex.errors,
      configWarnings: configResult.warnings,
    };
  }

  if (!registryResult.ok) {
    return {
      configErrors: [
        registryResult.error instanceof Error
          ? registryResult.error.message
          : "OpenAPI parsing failed.",
      ],
      configWarnings: configResult.warnings,
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
    visibleFlatNav,
    visibleNav,
  };
};

const getArtifacts = async () =>
  USE_LOCAL_RUNTIME_CACHE
    ? await artifactsCache.getOrCreate("preview", buildArtifacts)
    : await buildArtifacts();

const buildRenderedPageData = async ({
  artifacts,
  relativePath,
  useToc,
}: {
  artifacts: PreviewArtifacts;
  relativePath: string;
  useToc: boolean;
}): Promise<RenderedPageData> => {
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
};

const getRenderedPageData = async ({
  artifacts,
  currentPath,
  relativePath,
  useToc,
}: {
  artifacts: PreviewArtifacts;
  currentPath: string;
  relativePath: string;
  useToc: boolean;
}) =>
  USE_LOCAL_RUNTIME_CACHE
    ? await renderedPageCache.getOrCreate(
        currentPath,
        async () =>
          await buildRenderedPageData({
            artifacts,
            relativePath,
            useToc,
          })
      )
    : await buildRenderedPageData({
        artifacts,
        relativePath,
        useToc,
      });

const computePrevNext = (
  flatNav: NavPage[],
  currentPath: string
): {
  nextPage: { path: string; title: string } | undefined;
  prevPage: { path: string; title: string } | undefined;
} => {
  const currentIndex = flatNav.findIndex((page) => page.path === currentPath);

  return {
    nextPage:
      currentIndex !== -1 && currentIndex < flatNav.length - 1
        ? flatNav[currentIndex + 1]
        : undefined,
    prevPage: currentIndex > 0 ? flatNav[currentIndex - 1] : undefined,
  };
};

export const clearLocalRuntimeCaches = () => {
  if (!USE_LOCAL_RUNTIME_CACHE) {
    return;
  }

  artifactsCache.clear();
  renderedPageCache.clear();
};

export const getSearchItems = async () => {
  const artifacts = await getArtifacts();

  if (!artifacts || isConfigErrorResult(artifacts)) {
    return [];
  }

  return artifacts.searchItems;
};

export const getOpenApiProxyContext = async (): Promise<{
  config: SiteConfig;
  registry: OpenApiRegistry;
} | null> => {
  const artifacts = await getArtifacts();

  if (!artifacts || isConfigErrorResult(artifacts)) {
    return null;
  }

  return {
    config: artifacts.config,
    registry: artifacts.registry,
  };
};

// oxlint-disable-next-line eslint/complexity
export const getDocShellData = async (slugKey: string) => {
  const artifacts = await getArtifacts();

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
  const useToc =
    entry.type === "docs" && artifacts.config.features?.toc !== false;

  let rawContent = "";
  let toc: ReturnType<typeof extractToc> = [];

  try {
    rawContent = await loadContentSource(
      artifacts.contentSource,
      entry.relativePath
    );

    if (useToc) {
      toc = extractToc(rawContent);
    }
  } catch {
    // The page rendering path handles read failures.
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
    nextPage: computePrevNext(effectiveFlatNav, currentPath).nextPage,
    noindex: pageMeta?.noindex ?? false,
    pageDescription: entry.description,
    pageTitle: entry.title,
    prevPage: computePrevNext(effectiveFlatNav, currentPath).prevPage,
    rawContent,
    tabs: artifacts.tabs,
    toc,
  };
};

export const getDocPageContent = async (slugKey: string) => {
  const artifacts = await getArtifacts();

  if (!artifacts || isConfigErrorResult(artifacts)) {
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
    relativePath: entry.relativePath,
    useToc,
  });
};
