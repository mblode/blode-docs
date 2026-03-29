import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CollectionIndex } from "@/components/content/collection-index";
import { DocShell } from "@/components/docs/doc-shell";
import { getDocData } from "@/lib/docs-runtime";
import {
  getCanonicalDocBasePath,
  getCanonicalOrigin,
  getTenantRequestContextFromHeaders,
} from "@/lib/tenant-static";

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
      activeTabIndex={data.activeTabIndex}
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
      hideFooterPagination={data.hideFooterPagination}
      mode={data.mode}
      nav={data.nav}
      pageDescription={data.pageDescription}
      pageTitle={data.pageTitle}
      rawContent={data.rawContent}
      tabs={data.tabs}
      toc={data.toc}
    />
  );
};

export default DocPage;
