import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ApiReference } from "@/components/api/api-reference";
import { CollectionIndex } from "@/components/content/collection-index";
import { DocShell } from "@/components/docs/doc-shell";
import { getDocPageContent, getDocShellData } from "@/lib/docs-runtime";
import { TENANT_HEADERS } from "@/lib/tenant-headers";
import {
  getCanonicalDocBasePath,
  getCanonicalOrigin,
  getTenantRequestContextFromHeaders,
} from "@/lib/tenant-static";

export const dynamic = "force-dynamic";

// oxlint-disable-next-line eslint/complexity
export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ tenant: string; slug?: string[] }>;
}): Promise<Metadata> => {
  const { slug = [], tenant: tenantSlug } = await params;
  const slugKey = slug.join("/");
  const data = await getDocShellData(tenantSlug, slugKey);
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

const AsyncDocContent = async ({
  tenantSlug,
  slugKey,
}: {
  tenantSlug: string;
  slugKey: string;
}) => {
  const rendered = await getDocPageContent(tenantSlug, slugKey);
  if (!rendered) {
    return null;
  }
  return rendered.content;
};

// oxlint-disable-next-line eslint/complexity
const DocPage = async ({
  params,
}: {
  params: Promise<{ tenant: string; slug?: string[] }>;
}) => {
  const { slug = [], tenant: tenantSlug } = await params;
  const slugKey = slug.join("/");
  const headerStore = await headers();
  const headerTenant = headerStore.get(TENANT_HEADERS.SLUG);
  const basePathHeader = headerStore.get(TENANT_HEADERS.BASE_PATH) ?? "";
  if (headerTenant && headerTenant !== tenantSlug) {
    return notFound();
  }

  const shell = await getDocShellData(tenantSlug, slugKey);
  if (!shell) {
    return notFound();
  }

  if ("configErrors" in shell) {
    const errors = shell.configErrors ?? [];
    const warnings = shell.configWarnings ?? [];
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
      ? shell.tenant.pathPrefix || ""
      : `/sites/${shell.tenant.slug}`);

  let content: React.ReactNode;
  let rawContent: string | undefined;
  let toc: { id: string; title: string; level: number }[] = [];

  if (shell.kind === "openapi") {
    content = (
      <ApiReference
        entry={shell.openApiEntry}
        proxyEnabled={shell.openapiProxyEnabled}
      />
    );
    rawContent = shell.openApiEntry.operation.description ?? "";
  } else if (shell.kind === "index") {
    content = (
      <CollectionIndex
        basePath={basePath}
        entries={shell.collectionIndex.entries}
      />
    );
  } else {
    ({ rawContent } = shell);
    ({ toc } = shell);
    content = (
      <Suspense
        fallback={
          <div className="grid animate-pulse gap-4.5">
            <div className="h-4 w-full rounded bg-muted/40" />
            <div className="h-4 w-5/6 rounded bg-muted/40" />
            <div className="h-4 w-4/6 rounded bg-muted/40" />
            <div className="h-32 w-full rounded bg-muted/40" />
            <div className="h-4 w-full rounded bg-muted/40" />
            <div className="h-4 w-3/4 rounded bg-muted/40" />
          </div>
        }
      >
        <AsyncDocContent slugKey={slugKey} tenantSlug={tenantSlug} />
      </Suspense>
    );
  }

  return (
    <DocShell
      activeTabIndex={shell.activeTabIndex}
      anchors={shell.anchors}
      basePath={basePath}
      breadcrumbs={shell.breadcrumbs}
      config={shell.config}
      content={content}
      currentPath={shell.currentPath}
      deprecated={shell.deprecated}
      hideFooterPagination={shell.hideFooterPagination}
      mode={shell.mode}
      nav={shell.nav}
      nextPage={shell.nextPage}
      pageDescription={shell.pageDescription}
      pageTitle={shell.pageTitle}
      prevPage={shell.prevPage}
      rawContent={rawContent}
      tabs={shell.tabs}
      toc={toc}
    />
  );
};

export default DocPage;
