import { getDocPageContent, getDocShellData } from "@dev/lib/local-runtime";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApiReference } from "@/components/api/api-reference";
import { CollectionIndex } from "@/components/content/collection-index";
import { DocShell } from "@/components/docs/doc-shell";

const buildTitle = (pageTitle?: string, baseTitle = "Docs") =>
  pageTitle ? `${pageTitle} · ${baseTitle}` : baseTitle;

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> => {
  const { slug = [] } = await params;
  const data = await getDocShellData(slug.join("/"));

  if (!data || "configErrors" in data) {
    return {
      description: "Documentation",
      title: "Docs",
    };
  }

  const { config } = data;
  const title = buildTitle(data.pageTitle, config.name ?? "Docs");
  const noindex =
    data.noindex || (data.hidden && config.seo?.indexing !== "all");
  const ogImage = config.metadata?.ogImage;
  const { favicon } = config;

  return {
    description: data.pageDescription ?? config.description,
    icons: favicon ? { icon: favicon } : undefined,
    openGraph: ogImage
      ? {
          images: [ogImage],
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

const PreviewPage = async ({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) => {
  const { slug = [] } = await params;
  const slugKey = slug.join("/");
  const shell = await getDocShellData(slugKey);

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

  let content: React.ReactNode;
  let rawContent: string | undefined;
  let toc: { id: string; level: number; title: string }[] = [];

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
      <CollectionIndex basePath="" entries={shell.collectionIndex.entries} />
    );
  } else {
    ({ rawContent } = shell);
    ({ toc } = shell);
    const rendered = await getDocPageContent(slugKey);
    content = rendered?.content ?? null;
  }

  return (
    <DocShell
      activeTabIndex={shell.activeTabIndex}
      anchors={shell.anchors}
      basePath=""
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

export default PreviewPage;
