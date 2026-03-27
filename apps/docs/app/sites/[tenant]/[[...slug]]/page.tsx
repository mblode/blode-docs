import { normalizePath } from "@repo/common";
import type { ContentType } from "@repo/models";
import {
  buildContentIndex,
  loadContentSource,
  loadSiteConfig,
} from "@repo/previewing";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ApiReference } from "@/components/api/api-reference";
import { CollectionIndex } from "@/components/content/collection-index";
import { DocShell } from "@/components/docs/doc-shell";
import {
  getTenantContentSource,
  resolveSiteConfigAssets,
} from "@/lib/content-source";
import { renderMdx } from "@/lib/mdx";
import { buildNavigation, findBreadcrumbs, flattenNav } from "@/lib/navigation";
import { buildOpenApiRegistry } from "@/lib/openapi";
import {
  getCanonicalOrigin,
  getTenantRequestContextFromHeaders,
} from "@/lib/tenant-static";
import { getTenantBySlug } from "@/lib/tenants";
import { extractToc } from "@/lib/toc";

const labelFromType = (type: ContentType) => {
  switch (type) {
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
      return "Docs";
    }
  }
};

// oxlint-disable-next-line eslint/complexity
const getDocData = async (tenantSlug: string, slugKey: string) => {
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
  const nav = docsNavigation
    ? buildNavigation(
        docsNavigation,
        registry,
        docsCollection?.slugPrefix ?? ""
      )
    : [];
  const flatNav = flattenNav(nav);
  const anchors = docsNavigation?.global?.anchors ?? [];
  const searchItems = new Map<string, { title: string; path: string }>();
  for (const item of flatNav) {
    searchItems.set(item.path, { path: item.path, title: item.title });
  }
  for (const entry of contentIndex.entries) {
    searchItems.set(entry.slug, { path: entry.slug, title: entry.title });
  }

  const currentPath = normalizePath(slugKey) || "index";
  const openApiEntry = registry.bySlug.get(currentPath);

  if (openApiEntry) {
    return {
      anchors,
      breadcrumbs: findBreadcrumbs(nav, currentPath),
      config,
      content: (
        <ApiReference
          entry={openApiEntry}
          proxyEnabled={config.openapiProxy?.enabled ?? false}
        />
      ),
      currentPath,
      flatNav,
      headerLabel: "Docs",
      nav,
      pageDescription: openApiEntry.operation.description,
      pageTitle: openApiEntry.operation.summary ?? openApiEntry.identifier,
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
          > => collectionEntry.kind === "entry"
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
      flatNav,
      headerLabel: labelFromType(entry.type),
      nav: showDocsNav ? nav : [],
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
  const breadcrumbs = showDocsNav ? findBreadcrumbs(nav, currentPath) : [];

  return {
    anchors: showDocsNav ? anchors : [],
    breadcrumbs,
    config,
    content,
    currentPath,
    flatNav,
    headerLabel: labelFromType(entry.type),
    nav: showDocsNav ? nav : [],
    pageDescription,
    pageTitle,
    searchItems: [...searchItems.values()],
    tenant,
    toc,
  };
};

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

  const { config, pageTitle, pageDescription, tenant } = data;

  const baseTitle = config?.name ?? "Docs";
  const titleTemplate = `%s · ${baseTitle}`;
  const title = pageTitle ? titleTemplate.replace("%s", pageTitle) : baseTitle;

  const headerStore = await headers();
  const requestContext = getTenantRequestContextFromHeaders(
    tenant,
    headerStore
  );
  const canonicalBasePath =
    requestContext.strategy === "path"
      ? ""
      : requestContext.basePath || tenant.pathPrefix || "";
  const canonicalPath = slugKey ? `/${slugKey}` : "/";
  const fullCanonical = `${canonicalBasePath}${canonicalPath}`.replaceAll(
    /\/+/g,
    "/"
  );
  const canonicalOrigin = getCanonicalOrigin(tenant, requestContext);
  const ogImage = config?.metadata?.ogImage;
  const favicon = config?.favicon;

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

  return (
    <DocShell
      anchors={data.anchors}
      basePath={basePathHeader || data.tenant.pathPrefix || ""}
      breadcrumbs={data.breadcrumbs}
      config={data.config}
      content={
        data.collectionIndex ? (
          <CollectionIndex
            basePath={basePathHeader || data.tenant.pathPrefix || ""}
            entries={data.collectionIndex.entries}
          />
        ) : (
          data.content
        )
      }
      currentPath={data.currentPath}
      headerLabel={data.headerLabel}
      nav={data.nav}
      pageDescription={data.pageDescription}
      pageTitle={data.pageTitle}
      searchItems={data.searchItems}
      toc={data.toc}
    />
  );
};

export default DocPage;
