import { CloudUploadIcon, TriangleExclamationIcon } from "blode-icons-react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DocArticle } from "@/components/docs/doc-article";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { defaultOgImageUrl } from "@/lib/default-og-image";
import {
  getDocChromeData,
  getDocPageContent,
  getDocShellData,
} from "@/lib/docs-runtime";
import { toDocHref, toMarkdownDocHref } from "@/lib/routes";
import { buildDocsSeoTitle } from "@/lib/seo-title";
import {
  getCanonicalDocBasePath,
  getCanonicalOrigin,
  getStaticTenantRequestContext,
} from "@/lib/tenant-static";
import { getProjectTag } from "@/lib/tenants";
import type { TocItem } from "@/lib/toc";

import DocPageLoading from "./loading";

const getCachedDocShellData = async (tenantSlug: string, slugKey: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag(getProjectTag(tenantSlug), "tenants");
  return await getDocShellData(tenantSlug, slugKey);
};

const getCachedCanonicals = async (tenantSlug: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag(getProjectTag(tenantSlug), "tenants");

  const chrome = await getDocChromeData(tenantSlug);
  if (!chrome || "configErrors" in chrome || "emptyState" in chrome) {
    return null;
  }

  const requestContext = getStaticTenantRequestContext(chrome.tenant);
  const [basePath, origin] = await Promise.all([
    getCanonicalDocBasePath(chrome.tenant, requestContext),
    getCanonicalOrigin(chrome.tenant, requestContext),
  ]);

  return { basePath, origin };
};

const getCachedDocPageContent = async (
  tenantSlug: string,
  slugKey: string,
  basePath = "",
  rawContent?: string,
  toc?: TocItem[]
) => {
  "use cache";
  cacheLife("hours");
  cacheTag(getProjectTag(tenantSlug), "tenants");
  return await getDocPageContent(
    tenantSlug,
    slugKey,
    basePath,
    rawContent,
    toc
  );
};

// oxlint-disable-next-line eslint/complexity
export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ tenant: string; slug?: string[] }>;
}): Promise<Metadata> => {
  const { slug = [], tenant: tenantSlug } = await params;
  const slugKey = slug.join("/");
  const data = await getCachedDocShellData(tenantSlug, slugKey);
  if (!data) {
    // Unknown slug: throw so the response is a real 404, not title "Docs".
    notFound();
  }
  if ("configErrors" in data || "emptyState" in data) {
    if ("emptyState" in data && slugKey) {
      notFound();
    }
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
    metaDescription,
    noindex: pageNoindex,
    pageTitle,
    pageDescription,
  } = data;

  const baseTitle = config?.name ?? "Docs";
  // `og:site_name` is a separate lever from the title suffix. It defaults to
  // `name` so a site that says nothing is unaffected.
  const siteName = config?.seo?.siteName ?? baseTitle;
  const title = buildDocsSeoTitle({
    baseTitle,
    pageDescription,
    pageTitle,
    titleTemplate: config?.metadata?.titleTemplate,
  });
  const canonicals = await getCachedCanonicals(tenantSlug);
  const canonicalBasePath = canonicals?.basePath ?? "";
  const canonicalPath = slugKey ? `/${slugKey}` : "";
  // Collapse duplicate slashes and drop any trailing slash so the canonical
  // points at the final URL (the platform 308-redirects `/docs/` -> `/docs`).
  const fullCanonical =
    `${canonicalBasePath}${canonicalPath}`
      .replaceAll(/\/+/g, "/")
      .replace(/\/$/, "") || "/";
  const canonicalOrigin = canonicals?.origin ?? "https://blode.md";
  const canonicalUrl = `${canonicalOrigin}${fullCanonical}`;
  const favicon = config?.favicon;
  // Always emit a complete Open Graph + Twitter card. Fall back to the docs
  // app's default OG image when the tenant hasn't configured a custom one.
  // Path-aware: seo.siteUrl may include a zone path that must not be dropped.
  const ogImage =
    config?.metadata?.ogImage ??
    defaultOgImageUrl(canonicalOrigin, canonicalBasePath);
  const ogDescription =
    metaDescription ?? pageDescription ?? config?.description;
  const noindex = pageNoindex || (hidden && config.seo?.indexing !== "all");
  const markdownUrl =
    (kind === "page" || kind === "openapi") && currentPath
      ? `${canonicalOrigin}${toMarkdownDocHref(currentPath, canonicalBasePath)}`
      : undefined;

  return {
    alternates: {
      canonical: canonicalUrl,
      ...(markdownUrl ? { types: { "text/markdown": markdownUrl } } : {}),
    },
    description: ogDescription,
    icons: favicon ? { icon: favicon } : undefined,
    openGraph: {
      description: ogDescription,
      images: [ogImage],
      siteName,
      title,
      type: "website",
      url: canonicalUrl,
    },
    // Only declare `robots` when there is something to say: an explicit
    // `undefined` still counts as a declaration and wipes the root layout's
    // googleBot preview caps for the page.
    ...(noindex ? { robots: { index: false } } : {}),
    title,
    twitter: {
      card: "summary_large_image",
      description: ogDescription,
      images: [ogImage],
      title,
    },
  };
};

// oxlint-disable-next-line eslint/complexity
const CachedDocPage = async ({
  params,
}: {
  params: Promise<{ tenant: string; slug?: string[] }>;
}) => {
  const { slug = [], tenant: tenantSlug } = await params;
  const slugKey = slug.join("/");
  const [shell, canonicals] = await Promise.all([
    getCachedDocShellData(tenantSlug, slugKey),
    getCachedCanonicals(tenantSlug),
  ]);
  if (!shell) {
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

  const basePath = canonicals?.basePath ?? "";

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
    const rendered = await getCachedDocPageContent(
      tenantSlug,
      slugKey,
      basePath,
      rawContent,
      toc
    );
    if (!rendered) {
      notFound();
    }
    content = rendered.content ?? null;
  }

  const canonicalOrigin = canonicals?.origin ?? "";
  const canonicalPath =
    `${basePath}${slugKey ? `/${slugKey}` : ""}`
      .replaceAll(/\/+/g, "/")
      .replace(/\/$/, "") || "/";
  const canonicalUrl = `${canonicalOrigin}${canonicalPath}`;
  const markdownHrefAbsolute = markdownHref
    ? `${canonicalOrigin}${markdownHref}`
    : undefined;
  const webpage: Record<string, unknown> = {
    "@id": `${canonicalUrl}#webpage`,
    "@type": "WebPage",
    url: canonicalUrl,
  };
  if (shell.pageTitle) {
    webpage.headline = shell.pageTitle;
    webpage.name = shell.pageTitle;
  }
  const jsonLdDescription = shell.metaDescription ?? shell.pageDescription;
  if (jsonLdDescription) {
    webpage.description = jsonLdDescription;
  }
  if (markdownHref) {
    webpage.encoding = {
      "@type": "MediaObject",
      contentUrl: `${canonicalOrigin}${markdownHref}`,
      encodingFormat: "text/markdown",
    };
  }
  const graph: Record<string, unknown>[] = [webpage];
  if (shell.breadcrumbs.length > 0) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: shell.breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        item: `${canonicalOrigin}${toDocHref(crumb.path, basePath)}`,
        name: crumb.label,
        position: index + 1,
      })),
    });
  }
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <>
      {markdownHrefAbsolute ? (
        <link
          href={markdownHrefAbsolute}
          rel="alternate"
          type="text/markdown"
        />
      ) : null}
      <script
        // oxlint-disable-next-line no-danger -- JSON-LD for SEO
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
      <DocArticle
        basePath={basePath}
        breadcrumbs={shell.breadcrumbs}
        config={shell.config}
        content={content}
        currentPath={shell.currentPath}
        deprecated={shell.deprecated}
        hideFooterPagination={shell.hideFooterPagination}
        markdownHref={markdownHref}
        mode={shell.mode}
        nextPage={shell.nextPage}
        pageDescription={shell.pageDescription}
        pageTitle={shell.pageTitle}
        prevPage={shell.prevPage}
        rawContent={rawContent}
        toc={toc}
      />
    </>
  );
};

const DocPage = ({
  params,
}: {
  params: Promise<{ tenant: string; slug?: string[] }>;
}) => (
  <Suspense fallback={<DocPageLoading />}>
    <CachedDocPage params={params} />
  </Suspense>
);

export default DocPage;
