import { CloudUploadIcon, TriangleExclamationIcon } from "blode-icons-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DocShell } from "@/components/docs/doc-shell";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { getDocPageContent, getDocShellData } from "@/lib/docs-runtime";
import { toMarkdownDocHref } from "@/lib/routes";
import { TENANT_HEADERS } from "@/lib/tenant-headers";
import {
  getCanonicalDocBasePath,
  getCanonicalOrigin,
  getTenantRequestContextFromHeaders,
} from "@/lib/tenant-static";

export const preferredRegion = "home";
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

const getTenantRequestContext = async (
  tenantSlug: string,
  tenant: Parameters<typeof getTenantRequestContextFromHeaders>[0]
) => {
  const headerStore = await headers();
  if (headerStore.get(TENANT_HEADERS.SLUG) !== tenantSlug) {
    return null;
  }

  return getTenantRequestContextFromHeaders(tenant, headerStore);
};

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
    currentPath,
    hidden,
    kind,
    noindex: pageNoindex,
    pageTitle,
    pageDescription,
    tenant,
  } = data;

  const baseTitle = config?.name ?? "Docs";
  const titleTemplate = `%s · ${baseTitle}`;
  const title = pageTitle ? titleTemplate.replace("%s", pageTitle) : baseTitle;
  const requestContext = await getTenantRequestContext(tenantSlug, tenant);
  if (!requestContext) {
    return {
      description: "Documentation",
      title: "Docs",
    };
  }

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
  const markdownUrl =
    (kind === "page" || kind === "openapi") && currentPath
      ? `${canonicalOrigin}${toMarkdownDocHref(currentPath, canonicalBasePath)}`
      : undefined;

  return {
    alternates: {
      canonical: `${canonicalOrigin}${fullCanonical}`,
      ...(markdownUrl ? { types: { "text/markdown": markdownUrl } } : {}),
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

  const requestContext = await getTenantRequestContext(
    tenantSlug,
    shell.tenant
  );
  if (!requestContext) {
    return notFound();
  }

  if ("emptyState" in shell) {
    if (slugKey) {
      return notFound();
    }

    const pushCommands = "blodemd login\nblodemd push";
    const docsPath = shell.tenant.docsPath ?? "";

    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center gap-8 px-6 py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <div
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-foreground/10"
          >
            <CloudUploadIcon className="size-6" />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Unpublished project
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {shell.tenant.name} has no docs deployment yet.
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              This project exists, but Blode.md couldn&apos;t find a published
              deployment or a local docs root.
            </p>
          </div>
        </div>

        <Card size="sm">
          <CardHeader>
            <CardDescription className="text-[11px] font-medium uppercase tracking-[0.16em]">
              Expected local docs path
            </CardDescription>
            <CardTitle className="truncate font-mono font-normal text-foreground">
              {docsPath}
            </CardTitle>
            <CardAction className="self-center">
              <CopyButton
                aria-label="Copy docs path"
                content={docsPath}
                size="sm"
                variant="ghost"
              />
            </CardAction>
          </CardHeader>
        </Card>

        <div className="flex flex-col gap-2 text-left">
          <p className="text-sm font-medium">Publish with the CLI</p>
          <div className="relative overflow-hidden rounded-xl bg-code ring-1 ring-foreground/10">
            <pre className="no-scrollbar overflow-x-auto py-3 pr-14 pl-4 font-mono text-sm leading-6 text-code-foreground">
              <span className="select-none text-muted-foreground">$ </span>
              blodemd login{"\n"}
              <span className="select-none text-muted-foreground">$ </span>
              blodemd push
            </pre>
            <div className="absolute top-2 right-2">
              <CopyButton
                aria-label="Copy commands"
                content={pushCommands}
                size="sm"
                variant="ghost"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if ("configErrors" in shell) {
    const errors = shell.configErrors ?? [];
    const warnings = shell.configWarnings ?? [];

    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center gap-8 px-6 py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <div
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/30"
          >
            <TriangleExclamationIcon className="size-6" />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-destructive">
              Invalid configuration
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Your docs.json has errors.
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              Fix the problems below and redeploy.
            </p>
          </div>
        </div>

        {warnings.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Warnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm">
                {warnings.map((warning) => (
                  <li className="flex gap-3" key={warning}>
                    <span
                      aria-hidden="true"
                      className="mt-2 block size-1.5 shrink-0 rounded-full bg-muted-foreground"
                    />
                    <span className="leading-6">{warning}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {errors.length > 0 ? (
          <Card className="bg-destructive/5 ring-destructive/30">
            <CardHeader>
              <CardTitle className="text-[11px] font-medium uppercase tracking-[0.16em] text-destructive">
                Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm">
                {errors.map((error) => (
                  <li className="flex gap-3" key={error}>
                    <span
                      aria-hidden="true"
                      className="mt-2 block size-1.5 shrink-0 rounded-full bg-destructive"
                    />
                    <span className="leading-6">{error}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  const basePath = getCanonicalDocBasePath(shell.tenant, requestContext);

  let content: React.ReactNode;
  let rawContent: string | undefined;
  let toc: { id: string; title: string; level: number }[] = [];
  const markdownHref =
    shell.kind === "page" || shell.kind === "openapi"
      ? toMarkdownDocHref(shell.currentPath, basePath)
      : undefined;

  if (shell.kind === "openapi") {
    const { ApiReference } = await import("@/components/api/api-reference");
    content = (
      <ApiReference
        entry={shell.openApiEntry}
        proxyEnabled={shell.openapiProxyEnabled}
        tenantSlug={tenantSlug}
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

  const canonicalOrigin = getCanonicalOrigin(shell.tenant, requestContext);
  const canonicalUrl =
    `${canonicalOrigin}${basePath}${slugKey ? `/${slugKey}` : "/"}`.replaceAll(
      /\/+/g,
      "/"
    );
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: canonicalUrl,
  };
  if (shell.pageTitle) {
    jsonLd.headline = shell.pageTitle;
    jsonLd.name = shell.pageTitle;
  }
  if (shell.pageDescription) {
    jsonLd.description = shell.pageDescription;
  }
  if (markdownHref) {
    jsonLd.encoding = {
      "@type": "MediaObject",
      contentUrl: `${canonicalOrigin}${markdownHref}`,
      encodingFormat: "text/markdown",
    };
  }

  return (
    <>
      <script
        // oxlint-disable-next-line no-danger -- JSON-LD for SEO
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
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
    </>
  );
};

export default DocPage;
