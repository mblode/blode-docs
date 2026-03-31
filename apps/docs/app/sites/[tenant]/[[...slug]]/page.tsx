import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DocShell } from "@/components/docs/doc-shell";
import { getDocPageContent, getDocShellData } from "@/lib/docs-runtime";
import { toDocHref } from "@/lib/routes";
import {
  getCanonicalDocBasePath,
  getCanonicalOrigin,
  getTenantRequestContextFromHeaders,
} from "@/lib/tenant-static";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const DocContentFallback = () => (
  <div className="grid gap-4">
    <div className="h-5 w-3/4 rounded-md bg-border/60" />
    <div className="h-4 w-full rounded-md bg-border/40" />
    <div className="h-4 w-[92%] rounded-md bg-border/40" />
    <div className="h-4 w-[84%] rounded-md bg-border/40" />
    <div className="h-40 rounded-xl border border-dashed border-border/70 bg-muted/30" />
  </div>
);

const DocContent = async ({
  rawContent,
  slugKey,
  tenantSlug,
  toc,
}: {
  rawContent?: string;
  slugKey: string;
  tenantSlug: string;
  toc: { id: string; title: string; level: number }[];
}) => {
  const rendered = await getDocPageContent(
    tenantSlug,
    slugKey,
    rawContent,
    toc
  );
  if (!rendered) {
    notFound();
  }

  return rendered.content ?? null;
};

// oxlint-disable-next-line eslint/complexity
export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ tenant: string; slug?: string[] }>;
}): Promise<Metadata> => {
  const { slug = [], tenant: tenantSlug } = await params;
  const slugKey = slug.join("/");
  const data = await getDocShellData(tenantSlug, slugKey);
  if (!data || "configErrors" in data || "emptyState" in data) {
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

  if ("emptyState" in shell) {
    if (slugKey) {
      return notFound();
    }

    return (
      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center gap-6 px-6 py-16">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Unpublished Project
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {shell.tenant.name} has no docs deployment yet.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            This project exists, but Blode.md could not find a published
            deployment or a local docs root with a <code>docs.json</code> file.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-6">
          <p className="text-sm font-medium">Expected local docs path</p>
          <p className="mt-2 break-all font-mono text-sm text-muted-foreground">
            {shell.tenant.docsPath}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-6">
          <p className="text-sm font-medium">Next step</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Create a docs directory with <code>docs.json</code> and publish it
            with <code>blodemd push</code>, or place the local docs source at
            the path above for local development.
          </p>
        </div>
      </div>
    );
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

  const headerStore = await headers();
  const requestContext = getTenantRequestContextFromHeaders(
    shell.tenant,
    headerStore
  );
  const basePath = getCanonicalDocBasePath(shell.tenant, requestContext);

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
    const { ApiReference } = await import("@/components/api/api-reference");
    content = (
      <ApiReference
        entry={shell.openApiEntry}
        proxyEnabled={shell.openapiProxyEnabled}
      />
    );
    rawContent = shell.openApiEntry.operation.description ?? "";
  } else if (shell.kind === "index") {
    const { CollectionIndex } =
      await import("@/components/content/collection-index");
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
      <Suspense fallback={<DocContentFallback />}>
        <DocContent
          rawContent={rawContent}
          slugKey={slugKey}
          tenantSlug={tenantSlug}
          toc={toc}
        />
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
      markdownHref={markdownHref}
      rawContent={rawContent}
      tabs={shell.tabs}
      toc={toc}
    />
  );
};

export default DocPage;
