import { normalizePath } from "@repo/common";
import type { PageMode, Tenant } from "@repo/models";
import {
  buildContentIndex,
  buildPageMetadataMap,
  loadContentSource,
  loadPrebuiltContentIndex,
  loadSiteConfig,
} from "@repo/previewing";
import type {
  ContentIndex,
  ContentSource,
  PageMetadata,
} from "@repo/previewing";
import { headers } from "next/headers";
import { cache } from "react";

import { getTenantDocsPath } from "@/lib/content-root";
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
import { TENANT_HEADERS } from "@/lib/tenant-headers";
import { getTenantBySlug } from "@/lib/tenants";
import { extractToc } from "@/lib/toc";

const getTenantFromHeaders = async (slug: string): Promise<Tenant | null> => {
  const headerStore = await headers();
  const id = headerStore.get(TENANT_HEADERS.ID);
  const name = headerStore.get(TENANT_HEADERS.NAME);
  const primaryDomain = headerStore.get(TENANT_HEADERS.PRIMARY_DOMAIN);
  const subdomain = headerStore.get(TENANT_HEADERS.SUBDOMAIN);

  if (!id || !name || !primaryDomain || !subdomain) {
    return null;
  }

  return {
    activeDeploymentId:
      headerStore.get(TENANT_HEADERS.DEPLOYMENT_ID) ?? undefined,
    activeDeploymentManifestUrl:
      headerStore.get(TENANT_HEADERS.MANIFEST_URL) ?? undefined,
    customDomains:
      headerStore.get(TENANT_HEADERS.CUSTOM_DOMAINS)?.split(",") ?? [],
    docsPath: getTenantDocsPath(slug),
    id,
    name,
    pathPrefix: headerStore.get(TENANT_HEADERS.PATH_PREFIX) ?? undefined,
    primaryDomain,
    slug,
    // Proxy only forwards headers for resolved (active) tenants
    status: "active",
    subdomain,
  };
};

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

const ARTIFACT_CACHE_TTL_MS = 30 * 60 * 1000;
const PAGE_RENDER_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

const artifactsCache = createTimedPromiseCache<string, TenantArtifactsResult>({
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
  const tenant =
    (await getTenantFromHeaders(tenantSlug)) ??
    (await getTenantBySlug(tenantSlug));
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

    const rawConfig = configResult.config;
    const docsCollection = getDocsCollection(rawConfig);
    const docsNavigation = getDocsNavigation(rawConfig);
    const docsCollectionWithNavigation =
      getDocsCollectionWithNavigation(rawConfig);

    const [config, contentIndex, registryResult] = await Promise.all([
      resolveSiteConfigAssets(rawConfig, contentSource),
      loadPrebuiltContentIndex(contentSource).then(
        async (prebuilt) =>
          prebuilt ?? (await buildContentIndex(contentSource, rawConfig))
      ),
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

export const clearDocsRuntimeCachesForTenant = (tenantId: string) => {
  artifactsCache.deleteByPrefix(tenantId);
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
    const useToc =
      entry.type === "docs" && artifacts.config.features?.toc !== false;

    // Load raw content for TOC extraction without compiling MDX
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
      // Content load failure is handled by the content rendering path
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
      tenant: artifacts.tenant,
      toc,
    };
  }
);

/**
 * Compiles MDX content for a specific page. This is the slow operation
 * that benefits from being wrapped in a Suspense boundary.
 */
export const getDocPageContent = cache(
  async (tenantSlug: string, slugKey: string) => {
    const artifacts = await getTenantArtifacts(tenantSlug);
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
  }
);
