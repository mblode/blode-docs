import { normalizePath } from "@repo/common";
import type { ContentType } from "@repo/models";
import {
  buildContentIndex,
  buildPageMetadataMap,
  loadContentSource,
  loadSiteConfig,
} from "@repo/previewing";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ApiReference } from "@/components/api/api-reference";
import { CollectionIndex } from "@/components/content/collection-index";
import { DocShell } from "@/components/docs/doc-shell";
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
  enrichNavWithMetadata,
  findBreadcrumbs,
  flattenNav,
  getVisibleNavigation,
} from "@/lib/navigation";
import { buildOpenApiRegistry } from "@/lib/openapi";
import {
  getCanonicalDocBasePath,
  getCanonicalOrigin,
  getTenantRequestContextFromHeaders,
} from "@/lib/tenant-static";
import { getTenantBySlug } from "@/lib/tenants";
import { extractToc } from "@/lib/toc";

const labelFromType = (type: ContentType): string | undefined => {
  switch (type) {
    case "docs": {
      return "Docs";
    }
    case "blog": {
      return "Blog";
    }
    case "courses": {
      return "Courses";
    }
    case "products": {
      return "Products";
    }
    case "notes": {
      return "Notes";
    }
    case "forms": {
      return "Forms";
    }
    case "sheets": {
      return "Sheets";
    }
    case "slides": {
      return "Slides";
    }
    case "todos": {
      return "Todos";
    }
    case "site": {
      return "Site";
    }
    default: {
      return undefined;
    }
  }
};

// oxlint-disable-next-line eslint/complexity
const getDocData = cache(async (tenantSlug: string, slugKey: string) => {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return null;
  }

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
  const contentIndex = await buildContentIndex(contentSource, config);
  if (contentIndex.errors.length) {
    return {
      configErrors: contentIndex.errors,
      configWarnings: configResult.warnings,
      tenant,
    };
  }

  const docsCollection = getDocsCollection(config);
  const docsNavigation = getDocsNavigation(config);
  const docsCollectionWithNavigation = getDocsCollectionWithNavigation(config);
  let registry: Awaited<ReturnType<typeof buildOpenApiRegistry>>;
  try {
    registry = await buildOpenApiRegistry(
      docsCollectionWithNavigation,
      contentSource
    );
  } catch (error) {
    return {
      configErrors: [
        error instanceof Error ? error.message : "OpenAPI parsing failed",
      ],
      configWarnings: configResult.warnings,
      tenant,
    };
  }
  const pageMetadataMap = buildPageMetadataMap(contentIndex);
  const rawNav = docsNavigation
    ? buildNavigation(
        docsNavigation,
        registry,
        docsCollection?.slugPrefix ?? ""
      )
    : [];
  const nav = enrichNavWithMetadata(rawNav, pageMetadataMap);
  const visibleNav = getVisibleNavigation(nav);
  const flatNav = flattenNav(nav);
  const visibleFlatNav = flattenNav(visibleNav);
  const anchors = docsNavigation?.global?.anchors ?? [];
  const indexAll = config.seo?.indexing === "all";
  const searchItems = new Map<
    string,
    { href?: string; title: string; path: string }
  >();
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

  const currentPath = normalizePath(slugKey) || "index";
  const openApiEntry = registry.bySlug.get(currentPath);

  if (openApiEntry) {
    const isHidden = flatNav.some((p) => p.path === currentPath && p.hidden);
    return {
      anchors,
      breadcrumbs: findBreadcrumbs(visibleNav, currentPath),
      config,
      content: (
        <ApiReference
          entry={openApiEntry}
          proxyEnabled={config.openapiProxy?.enabled ?? false}
        />
      ),
      currentPath,
      deprecated: false,
      flatNav: visibleFlatNav,
      headerLabel: "Docs",
      hidden: isHidden,
      hideFooterPagination: false,
      mode: undefined,
      nav: visibleNav,
      noindex: false,
      pageDescription: openApiEntry.operation.description,
      pageTitle: openApiEntry.operation.summary ?? openApiEntry.identifier,
      rawContent: openApiEntry.operation.description ?? "",
      searchItems: [...searchItems.values()],
      tenant,
      toc: [],
    };
  }

  const entry = contentIndex.bySlug.get(currentPath) ?? null;
  if (!entry) {
    return null;
  }

  if (entry.kind === "index") {
    const collectionEntries =
      contentIndex.byCollection
        .get(entry.collectionId)
        ?.filter(
          (
            collectionEntry
          ): collectionEntry is Extract<
            (typeof contentIndex.entries)[number],
            { kind: "entry" }
          > =>
            collectionEntry.kind === "entry" &&
            collectionEntry.hidden !== true &&
            !pageMetadataMap.get(collectionEntry.slug)?.hidden &&
            !pageMetadataMap.get(collectionEntry.slug)?.noindex
        ) ?? [];
    const showDocsNav = entry.type === "docs";
    return {
      anchors: showDocsNav ? anchors : [],
      breadcrumbs: [],
      collectionIndex: {
        entries: collectionEntries,
      },
      config,
      content: null,
      currentPath,
      deprecated: false,
      flatNav: visibleFlatNav,
      headerLabel: labelFromType(entry.type),
      hidden: false,
      hideFooterPagination: false,
      mode: undefined,
      nav: showDocsNav ? visibleNav : [],
      noindex: false,
      pageDescription: entry.description,
      pageTitle: entry.title,
      searchItems: [...searchItems.values()],
      tenant,
      toc: [],
    };
  }

  const source = await loadContentSource(contentSource, entry.relativePath);
  const { content, frontmatter } = await renderMdx(source);
  const useToc = entry.type === "docs" && config.features?.toc !== false;
  const toc = useToc ? extractToc(source) : [];
  const pageTitle = (frontmatter?.title as string | undefined) ?? entry.title;
  const pageDescription =
    (frontmatter?.description as string | undefined) ?? entry.description;
  const showDocsNav = entry.type === "docs";
  const breadcrumbs = showDocsNav
    ? findBreadcrumbs(visibleNav, currentPath)
    : [];
  const isHiddenByFrontmatter = frontmatter?.hidden === true;
  const isHiddenByNav = flatNav.some((p) => p.path === currentPath && p.hidden);
  const isHidden =
    isHiddenByFrontmatter || isHiddenByNav || entry.hidden === true;
  const pageMeta = pageMetadataMap.get(currentPath);

  return {
    anchors: showDocsNav ? anchors : [],
    breadcrumbs,
    config,
    content,
    currentPath,
    deprecated: pageMeta?.deprecated ?? false,
    flatNav: visibleFlatNav,
    headerLabel: labelFromType(entry.type),
    hidden: isHidden,
    hideFooterPagination: pageMeta?.hideFooterPagination ?? false,
    mode: pageMeta?.mode,
    nav: showDocsNav ? visibleNav : [],
    noindex: pageMeta?.noindex ?? false,
    pageDescription,
    pageTitle,
    rawContent: source,
    searchItems: [...searchItems.values()],
    tenant,
    toc,
  };
});

// oxlint-disable-next-line eslint/complexity
export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ tenant: string; slug?: string[] }>;
}): Promise<Metadata> => {
  const { slug = [], tenant: tenantSlug } = await params;
  const slugKey = slug.join("/");
  const data = await getDocData(tenantSlug, slugKey);
  if (!data || "configErrors" in data) {
    return {
      description: "Documentation",
      title: "Docs",
    };
  }

  const {
    config,
    hidden,
    noindex: pageNoindex,
    pageTitle,
    pageDescription,
    tenant,
  } = data;

  const baseTitle = config?.name ?? "Docs";
  const titleTemplate = `%s · ${baseTitle}`;
  const title = pageTitle ? titleTemplate.replace("%s", pageTitle) : baseTitle;

  const headerStore = await headers();
  const requestContext = getTenantRequestContextFromHeaders(
    tenant,
    headerStore
  );
  const canonicalBasePath = getCanonicalDocBasePath(tenant, requestContext);
  const canonicalPath = slugKey ? `/${slugKey}` : "/";
  const fullCanonical = `${canonicalBasePath}${canonicalPath}`.replaceAll(
    /\/+/g,
    "/"
  );
  const canonicalOrigin = getCanonicalOrigin(tenant, requestContext);
  const ogImage = config?.metadata?.ogImage;
  const favicon = config?.favicon;
  const noindex = pageNoindex || (hidden && config.seo?.indexing !== "all");

  return {
    alternates: {
      canonical: `${canonicalOrigin}${fullCanonical}`,
    },
    description: pageDescription ?? config?.description,
    icons: favicon ? { icon: favicon } : undefined,
    openGraph: ogImage
      ? {
          images: [ogImage],
          url: `${canonicalOrigin}${fullCanonical}`,
        }
      : undefined,
    robots: noindex ? { index: false } : undefined,
    title,
    twitter: ogImage
      ? {
          card: "summary_large_image",
          images: [ogImage],
        }
      : undefined,
  };
};

const DocPage = async ({
  params,
}: {
  params: Promise<{ tenant: string; slug?: string[] }>;
}) => {
  const { slug = [], tenant: tenantSlug } = await params;
  const slugKey = slug.join("/");
  const headerStore = await headers();
  const headerTenant = headerStore.get("x-tenant-slug");
  const basePathHeader = headerStore.get("x-tenant-base-path") ?? "";
  if (headerTenant && headerTenant !== tenantSlug) {
    return notFound();
  }
  const data = await getDocData(tenantSlug, slugKey);
  if (!data) {
    return notFound();
  }

  if ("configErrors" in data) {
    const errors = data.configErrors ?? [];
    const warnings = data.configWarnings ?? [];
    return (
      <div className="p-10">
        <h1>Invalid docs.json</h1>
        {warnings.length ? (
          <>
            <h2>Warnings</h2>
            <ul>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </>
        ) : null}
        <ul>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  const basePath =
    basePathHeader ||
    (headerTenant
      ? data.tenant.pathPrefix || ""
      : `/sites/${data.tenant.slug}`);

  return (
    <DocShell
      anchors={data.anchors}
      basePath={basePath}
      breadcrumbs={data.breadcrumbs}
      config={data.config}
      content={
        data.collectionIndex ? (
          <CollectionIndex
            basePath={basePath}
            entries={data.collectionIndex.entries}
          />
        ) : (
          data.content
        )
      }
      currentPath={data.currentPath}
      deprecated={data.deprecated}
      flatNav={data.flatNav}
      headerLabel={data.headerLabel}
      hideFooterPagination={data.hideFooterPagination}
      mode={data.mode}
      nav={data.nav}
      pageDescription={data.pageDescription}
      pageTitle={data.pageTitle}
      rawContent={data.rawContent}
      searchItems={data.searchItems}
      toc={data.toc}
    />
  );
};

export default DocPage;
