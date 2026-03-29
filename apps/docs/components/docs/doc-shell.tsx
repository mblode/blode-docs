import type { PageMode, SiteConfig } from "@repo/models";
import { ArrowLeftIcon, ArrowRightIcon } from "blode-icons-react";
import dynamic from "next/dynamic";
import Script from "next/script";
import { Fragment, Suspense } from "react";
import type { ReactNode } from "react";

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
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { NavEntry, NavTab } from "@/lib/navigation";
import { toDocHref } from "@/lib/routes";
import { themeStylesFromConfig } from "@/lib/theme";
import type { TocItem } from "@/lib/toc";
import { cn } from "@/lib/utils";

const ContextualMenu = dynamic(async () => {
  const m = await import("@/components/docs/contextual-menu");
  return { default: m.ContextualMenu };
});

const ContextualTocItems = dynamic(async () => {
  const m = await import("@/components/docs/contextual-menu");
  return { default: m.ContextualTocItems };
});

const CopyPageMenu = dynamic(async () => {
  const m = await import("@/components/docs/copy-page-menu");
  return { default: m.CopyPageMenu };
});

const renderScripts = (
  scripts?: string[],
  strategy: "afterInteractive" | "lazyOnload" = "afterInteractive"
) =>
  scripts?.map((script) => (
    <Script key={script} src={script} strategy={strategy} />
  )) ?? null;

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
                  <BreadcrumbLink href={toDocHref(crumb.path, basePath)}>
                    {crumb.label}
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
  flatNav,
  toc,
  content,
  currentPath,
  breadcrumbs,
  pageTitle,
  pageDescription,
  anchors,
  activeTabIndex,
  basePath,
  rawContent,
  tabs,
  mode,
  deprecated,
  hideFooterPagination,
}: {
  config: SiteConfig;
  nav: NavEntry[];
  flatNav: { title: string; path: string }[];
  toc: TocItem[];
  content: ReactNode;
  currentPath: string;
  breadcrumbs: { label: string; path: string }[];
  pageTitle: string;
  pageDescription?: string;
  anchors?: { label: string; href: string }[];
  activeTabIndex?: number;
  basePath: string;
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

  const pages = flatNav;
  const currentIndex = pages.findIndex((p) => p.path === currentPath);
  const prevPage = currentIndex > 0 ? pages[currentIndex - 1] : undefined;
  const nextPage =
    currentIndex !== -1 && currentIndex < pages.length - 1
      ? pages[currentIndex + 1]
      : undefined;

  const contextualTocItems =
    contextual && contextualDisplay === "toc" && rawContent !== undefined ? (
      <ContextualTocItems
        content={rawContent}
        options={contextual.options}
        pagePath={currentPath}
        title={pageTitle}
      />
    ) : null;

  const headerContextualMenu =
    contextual && contextualDisplay === "header" && rawContent !== undefined ? (
      <ContextualMenu
        content={rawContent}
        options={contextual.options}
        pagePath={currentPath}
        title={pageTitle}
      />
    ) : null;

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
      {renderScripts(config.scripts?.head)}
      <DocHeader
        activeTabIndex={activeTabIndex}
        basePath={basePath}
        config={config}
        nav={nav}
        tabs={tabs}
      />
      <div className="container-wrapper flex flex-1 flex-col px-6">
        <SidebarProvider
          className={cn(
            "min-h-min flex-1 items-start px-0 [--top-spacing:0] lg:[--top-spacing:calc(var(--spacing)*4)]",
            showSidebar &&
              "lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]"
          )}
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
            } as React.CSSProperties
          }
        >
          {showSidebar ? (
            <DocSidebar
              anchors={anchors}
              basePath={basePath}
              currentPath={currentPath}
              entries={nav}
            />
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="h-(--top-spacing) shrink-0" />
            {isCustomMode ? (
              <main id="main-content">{content}</main>
            ) : (
              <main
                className={cn(
                  "flex scroll-mt-24 items-stretch gap-1 px-4 lg:px-8",
                  !showSidebar && "mx-auto max-w-[960px]"
                )}
                id="main-content"
              >
                <div
                  className={cn(
                    "mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 px-4 py-6 text-neutral-800 md:px-0 lg:py-8 dark:text-neutral-300",
                    pageMode === "wide" ? "max-w-[60rem]" : "max-w-[40rem]"
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <Breadcrumbs
                      basePath={basePath}
                      breadcrumbs={breadcrumbs}
                    />
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between md:items-start">
                        <h1 className="scroll-m-24 text-3xl font-semibold tracking-tight sm:text-3xl">
                          {pageTitle}
                          {deprecated ? (
                            <span className="ml-3 inline-flex translate-y-[-2px] items-center rounded-md bg-yellow-100 px-2 py-0.5 align-middle text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                              Deprecated
                            </span>
                          ) : null}
                        </h1>
                        {headerContextualMenu ??
                          (rawContent === undefined ? null : (
                            <CopyPageMenu
                              content={rawContent}
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
                    <div className="grid gap-4.5 leading-relaxed [&_blockquote]:border-l-3 [&_blockquote]:border-primary [&_blockquote]:pl-3.5 [&_blockquote]:text-muted-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-[1.375rem] [&_h3]:font-semibold [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:border-b [&_td]:border-border [&_td]:px-2.5 [&_td]:py-2 [&_td]:text-left [&_th]:border-b [&_th]:border-border [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_ul]:pl-5">
                      {content}
                    </div>
                  </Suspense>
                  {!hideFooterPagination && (prevPage || nextPage) ? (
                    <nav className="hidden h-16 w-full items-center gap-2 px-4 sm:flex sm:px-0">
                      {prevPage ? (
                        <Button asChild size="sm" variant="secondary">
                          <a href={toDocHref(prevPage.path, basePath)}>
                            <ArrowLeftIcon aria-hidden="true" />
                            {prevPage.title}
                          </a>
                        </Button>
                      ) : null}
                      {nextPage ? (
                        <Button
                          asChild
                          className="ml-auto"
                          size="sm"
                          variant="secondary"
                        >
                          <a href={toDocHref(nextPage.path, basePath)}>
                            {nextPage.title}
                            <ArrowRightIcon aria-hidden="true" />
                          </a>
                        </Button>
                      ) : null}
                    </nav>
                  ) : null}
                </div>
                {hasToc ? (
                  <DocToc contextualItems={contextualTocItems} toc={toc} />
                ) : null}
              </main>
            )}
          </div>
        </SidebarProvider>
      </div>
      {renderScripts(config.scripts?.body, "lazyOnload")}
    </div>
  );
};
