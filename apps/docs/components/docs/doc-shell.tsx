import type { PageMode, SiteConfig } from "@repo/models";
import { ChevronLeftIcon, ChevronRightIcon } from "blode-icons-react";
import Link from "next/link";
import Script from "next/script";
import { Fragment } from "react";
import type { ReactNode } from "react";

import {
  ContextualMenu,
  ContextualTocItems,
} from "@/components/docs/contextual-menu";
import { CopyPageMenu } from "@/components/docs/copy-page-menu";
import { DocHeader } from "@/components/docs/doc-header";
import { DocSidebar } from "@/components/docs/doc-sidebar";
import { DocToc } from "@/components/docs/doc-toc";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { NavEntry, NavTab } from "@/lib/navigation";
import { toDocHref } from "@/lib/routes";
import { themeStylesFromConfig } from "@/lib/theme";
import type { TocItem } from "@/lib/toc";
import { cn } from "@/lib/utils";

const DocScripts = ({
  scripts,
  strategy = "afterInteractive",
}: {
  scripts?: string[];
  strategy?: "afterInteractive" | "lazyOnload";
}) => {
  if (!scripts?.length) {
    return null;
  }

  return scripts.map((script) => (
    <Script key={script} src={script} strategy={strategy} />
  ));
};

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
                    <Link href={toDocHref(crumb.path, basePath)}>
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

// oxlint-disable-next-line eslint/complexity
export const DocShell = ({
  config,
  nav,
  prevPage,
  nextPage,
  toc,
  content,
  currentPath,
  breadcrumbs,
  pageTitle,
  pageDescription,
  anchors,
  activeTabIndex,
  basePath,
  markdownHref,
  rawContent,
  tabs,
  mode,
  deprecated,
  hideFooterPagination,
}: {
  config: SiteConfig;
  nav: NavEntry[];
  prevPage?: { title: string; path: string };
  nextPage?: { title: string; path: string; description?: string };
  toc: TocItem[];
  content: ReactNode;
  currentPath: string;
  breadcrumbs: { label: string; path: string }[];
  pageTitle: string;
  pageDescription?: string;
  anchors?: { label: string; href: string }[];
  activeTabIndex?: number;
  basePath: string;
  markdownHref?: string;
  rawContent?: string;
  tabs?: NavTab[] | null;
  mode?: PageMode;
  deprecated?: boolean;
  hideFooterPagination?: boolean;
}) => {
  const pageMode = mode ?? "default";
  const isCustomMode = pageMode === "custom";
  const showSidebar =
    pageMode !== "custom" &&
    pageMode !== "center" &&
    Boolean((nav?.length ?? 0) || (anchors?.length ?? 0));
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

  const innerContent = (
    <div className="flex min-w-0 flex-1 flex-col">
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
                <Breadcrumbs basePath={basePath} breadcrumbs={breadcrumbs} />
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
                  {pageDescription ? (
                    <p className="text-[1.05rem] text-muted-foreground sm:text-balance sm:text-base md:max-w-[80%]">
                      {pageDescription}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-4.5 leading-relaxed [&_blockquote]:border-l-3 [&_blockquote]:border-primary [&_blockquote]:pl-3.5 [&_blockquote]:text-muted-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-[1.375rem] [&_h3]:font-semibold [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:border-b [&_td]:border-border [&_td]:px-2.5 [&_td]:py-2 [&_td]:text-left [&_th]:border-b [&_th]:border-border [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-6">
                {content}
              </div>
              {!hideFooterPagination && (prevPage || nextPage) ? (
                <nav
                  className="flex w-full rounded-2xl bg-muted/50 p-1 text-sm"
                  id="pagination"
                >
                  {prevPage ? (
                    <Link
                      className="group flex items-center justify-between gap-1.5 pl-3 pr-6"
                      href={toDocHref(prevPage.path, basePath)}
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
            </div>
          </div>
          {hasToc ? (
            <DocToc contextualItems={contextualTocItems} toc={toc} />
          ) : null}
        </main>
      )}
    </div>
  );

  return (
    <div
      className="min-h-screen font-sans"
      data-has-dark-logo={config.logo?.dark ? "true" : "false"}
      style={themeStylesFromConfig(config)}
    >
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-sm"
        href="#main-content"
      >
        Skip to content
      </a>
      <DocScripts scripts={config.scripts?.head} />
      <DocHeader
        activeTabIndex={activeTabIndex}
        basePath={basePath}
        config={config}
        nav={nav}
        tabs={tabs}
      />
      <div className="container-wrapper flex flex-1 flex-col">
        {showSidebar ? (
          <div
            className="min-h-min flex-1 items-start px-0 [--top-spacing:0] lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:[--top-spacing:calc(var(--spacing)*4)]"
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
              } as React.CSSProperties
            }
          >
            <DocSidebar
              anchors={anchors}
              basePath={basePath}
              currentPath={currentPath}
              entries={nav}
            />
            {innerContent}
          </div>
        ) : (
          <div className="min-h-min flex-1 items-start px-0 [--top-spacing:0] lg:[--top-spacing:calc(var(--spacing)*4)]">
            {innerContent}
          </div>
        )}
      </div>
      <DocScripts scripts={config.scripts?.body} strategy="lazyOnload" />
    </div>
  );
};
