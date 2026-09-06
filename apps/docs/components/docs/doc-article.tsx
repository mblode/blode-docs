import type { PageMode, SiteConfig } from "@repo/models";
import { ChevronLeftIcon, ChevronRightIcon } from "blode-icons-react";
import Link from "next/link";
import { Fragment } from "react";
import type { ReactNode } from "react";

import {
  ContextualMenu,
  ContextualTocItems,
} from "@/components/docs/contextual-menu";
import { CopyPageMenu } from "@/components/docs/copy-page-menu";
import { DocToc } from "@/components/docs/doc-toc";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toDocHref } from "@/lib/routes";
import type { TocItem } from "@/lib/toc";
import { cn } from "@/lib/utils";

const Breadcrumbs = ({
  basePath,
  breadcrumbs,
}: {
  basePath: string;
  breadcrumbs: { label: string; path: string }[];
}) => {
  if (!breadcrumbs.length) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => {
          const key = `${crumb.path || "current"}-${crumb.label}`;
          const isLast = index === breadcrumbs.length - 1;
          return (
            <Fragment key={key}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      href={toDocHref(crumb.path, basePath)}
                      prefetch={true}
                    >
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export const DocArticle = ({
  basePath,
  breadcrumbs,
  config,
  content,
  currentPath,
  deprecated,
  hideFooterPagination,
  markdownHref,
  mode,
  nextPage,
  pageDescription,
  pageTitle,
  prevPage,
  rawContent,
  toc,
}: {
  basePath: string;
  breadcrumbs: { label: string; path: string }[];
  config: SiteConfig;
  content: ReactNode;
  currentPath: string;
  deprecated?: boolean;
  hideFooterPagination?: boolean;
  markdownHref?: string;
  mode?: PageMode;
  nextPage?: { title: string; path: string; description?: string };
  pageDescription?: string;
  pageTitle: string;
  prevPage?: { title: string; path: string };
  rawContent?: string;
  toc: TocItem[];
}) => {
  const pageMode = mode ?? "default";
  const isCustomMode = pageMode === "custom";
  const { contextual } = config;
  const contextualDisplay = contextual?.display ?? "header";
  const hasToc =
    pageMode !== "custom" &&
    pageMode !== "wide" &&
    pageMode !== "frame" &&
    pageMode !== "center" &&
    config.features?.rightToc !== false &&
    config.features?.toc !== false &&
    (toc.length > 0 || (contextual && contextualDisplay === "toc"));

  const contextualTocItems =
    contextual && contextualDisplay === "toc" ? (
      <ContextualTocItems
        content={rawContent}
        key={`toc-${currentPath}`}
        options={contextual.options}
        pagePath={currentPath}
        title={pageTitle}
      />
    ) : null;

  const headerContextualMenu =
    contextual && contextualDisplay === "header" ? (
      <ContextualMenu
        content={rawContent}
        key={`header-${currentPath}`}
        options={contextual.options}
        pagePath={currentPath}
        title={pageTitle}
      />
    ) : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col" data-page-mode={pageMode}>
      <div className="h-(--top-spacing) shrink-0" />
      {isCustomMode ? (
        <main id="main-content">{content}</main>
      ) : (
        <main
          className="flex scroll-mt-24 items-stretch pb-8 text-[1.05rem] sm:text-[15px] xl:w-full"
          id="main-content"
          role="application"
          style={{ "--sidebar-width": "14rem" } as React.CSSProperties}
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <div
              className={cn(
                "mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 px-4 py-6 text-neutral-800 md:px-0 lg:py-8 dark:text-neutral-300",
                pageMode === "wide" ? "max-w-[60rem]" : "max-w-[40rem]"
              )}
            >
              <div className="flex flex-col gap-2">
                <p
                  className="sr-only"
                  data-agent-directive=""
                  data-markdown-ignore=""
                >
                  AI agents: fetch the documentation index at{" "}
                  <Link href={toDocHref("llms.txt", basePath)}>llms.txt</Link>.
                  Markdown versions are available by appending .md to any page
                  URL
                  {markdownHref ? (
                    <>
                      , including{" "}
                      <Link href={markdownHref}>this page&apos;s markdown</Link>
                    </>
                  ) : null}
                  .
                </p>
                <div data-markdown-ignore="">
                  <Breadcrumbs basePath={basePath} breadcrumbs={breadcrumbs} />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                    <h1 className="min-w-0 scroll-m-24 text-3xl font-semibold tracking-tight sm:text-3xl">
                      {pageTitle}
                      {deprecated ? (
                        <span className="ml-3 inline-flex translate-y-[-2px] items-center rounded-md bg-yellow-100 px-2 py-0.5 align-middle text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                          Deprecated
                        </span>
                      ) : null}
                    </h1>
                    <div data-markdown-ignore="">
                      {headerContextualMenu ??
                        (rawContent === undefined &&
                        markdownHref === undefined ? null : (
                          <CopyPageMenu
                            content={markdownHref ? undefined : rawContent}
                            contentUrl={markdownHref}
                            key={`copy-${currentPath}`}
                            title={pageTitle}
                          />
                        ))}
                    </div>
                  </div>
                  {pageDescription ? (
                    <p className="text-[1.05rem] text-muted-foreground sm:text-balance sm:text-base md:max-w-[80%]">
                      {pageDescription}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="typeset min-w-0">{content}</div>
              {!hideFooterPagination && (prevPage || nextPage) ? (
                <nav
                  className="flex w-full rounded-2xl bg-muted/50 p-1 text-sm"
                  data-markdown-ignore=""
                  id="pagination"
                >
                  {prevPage ? (
                    <Link
                      className="group flex items-center justify-between gap-1.5 pl-3 pr-6"
                      href={toDocHref(prevPage.path, basePath)}
                      prefetch={true}
                    >
                      <ChevronLeftIcon
                        aria-hidden="true"
                        className="size-3 text-muted-foreground/50 group-hover:text-muted-foreground"
                      />
                      <span className="font-medium tracking-tight text-muted-foreground group-hover:text-foreground">
                        Previous
                      </span>
                    </Link>
                  ) : null}
                  {nextPage ? (
                    <Link
                      className="group ml-auto flex w-full min-w-0 flex-1"
                      href={toDocHref(nextPage.path, basePath)}
                      prefetch={true}
                    >
                      <div className="flex flex-1 items-center justify-end rounded-xl bg-background hover:ring-1 hover:ring-border sm:h-16">
                        <div className="flex min-w-0 flex-col items-end justify-center px-5">
                          <span className="text-right font-semibold text-foreground/80">
                            {nextPage.title}
                          </span>
                          {nextPage.description ? (
                            <span className="hidden w-full truncate text-right text-muted-foreground lg:block lg:w-72">
                              {nextPage.description}
                            </span>
                          ) : null}
                        </div>
                        <div className="h-8 w-px bg-border/50" />
                        <div className="flex items-center gap-1.5 pl-5 pr-3">
                          <span className="font-medium tracking-tight text-muted-foreground group-hover:text-foreground">
                            Next
                          </span>
                          <ChevronRightIcon
                            aria-hidden="true"
                            className="size-3 text-muted-foreground/50 group-hover:text-muted-foreground"
                          />
                        </div>
                      </div>
                    </Link>
                  ) : null}
                </nav>
              ) : null}
              <p
                className="mt-10 text-muted-foreground text-xs"
                data-markdown-ignore=""
              >
                Published with{" "}
                <a
                  className="underline underline-offset-4 hover:text-foreground"
                  href="https://blode.md"
                >
                  Blode.md
                </a>
              </p>
            </div>
          </div>
          {hasToc ? (
            <DocToc contextualItems={contextualTocItems} toc={toc} />
          ) : null}
        </main>
      )}
    </div>
  );
};
