import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApiReference } from "@/components/api/api-reference";
import { CollectionIndex } from "@/components/content/collection-index";
import { DocShell } from "@/components/docs/doc-shell";
import { getDocPageContent, getDocShellData } from "@/lib/docs-runtime";
import { toDocHref } from "@/lib/routes";

export const dynamic = "force-static";
export const preferredRegion = "home";
export const revalidate = 3600;

const getTenantBasePath = (pathPrefix?: string) => pathPrefix ?? "";

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

  const canonicalBasePath = getTenantBasePath(tenant.pathPrefix);
  const canonicalPath = slugKey ? `/${slugKey}` : "/";
  const fullCanonical = `${canonicalBasePath}${canonicalPath}`.replaceAll(
    /\/+/g,
    "/"
  );
  const canonicalOrigin = `https://${tenant.primaryDomain}`;
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

// oxlint-disable-next-line eslint/complexity
const DocPage = async ({
  params,
}: {
  params: Promise<{ tenant: string; slug?: string[] }>;
}) => {
  const { slug = [], tenant: tenantSlug } = await params;
  const slugKey = slug.join("/");
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

  const basePath = getTenantBasePath(shell.tenant.pathPrefix);

  let content: React.ReactNode;
  let rawContent: string | undefined;
  let toc: { id: string; title: string; level: number }[] = [];
  const markdownHref =
    shell.kind === "page"
      ? toDocHref(
          shell.currentPath === "index"
            ? "index.mdx"
            : `${shell.currentPath}.mdx`,
          basePath
        )
      : undefined;

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
    const rendered = await getDocPageContent(tenantSlug, slugKey, rawContent);
    content = rendered?.content ?? null;
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
      markdownHref={markdownHref}
      rawContent={rawContent}
      tabs={shell.tabs}
      toc={toc}
    />
  );
};

export default DocPage;
