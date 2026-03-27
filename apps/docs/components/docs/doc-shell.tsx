import type { SiteConfig } from "@repo/models";
import Script from "next/script";
import type { ReactNode } from "react";

import { DocHeader } from "@/components/docs/doc-header";
import { DocSidebar } from "@/components/docs/doc-sidebar";
import { DocToc } from "@/components/docs/doc-toc";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { NavEntry } from "@/lib/navigation";
import { toDocHref } from "@/lib/routes";
import { themeStylesFromConfig } from "@/lib/theme";
import type { TocItem } from "@/lib/toc";
import { cn } from "@/lib/utils";

const renderScripts = (scripts?: string[]) =>
  scripts?.map((script) => (
    <Script key={script} src={script} strategy="afterInteractive" />
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
    <nav className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
      {breadcrumbs.map((crumb, index) => {
        const key = `${crumb.path || "current"}-${crumb.label}`;
        const isLast = index === breadcrumbs.length - 1;
        return (
          <span key={key}>
            {crumb.path ? (
              <a href={toDocHref(crumb.path, basePath)}>{crumb.label}</a>
            ) : (
              <span>{crumb.label}</span>
            )}
            {isLast ? null : <span className="mx-1.5">/</span>}
          </span>
        );
      })}
    </nav>
  );
};

export const DocShell = ({
  config,
  nav,
  toc,
  content,
  currentPath,
  breadcrumbs,
  pageTitle,
  pageDescription,
  searchItems,
  anchors,
  basePath,
  headerLabel,
}: {
  config: SiteConfig;
  nav: NavEntry[];
  toc: TocItem[];
  content: ReactNode;
  currentPath: string;
  breadcrumbs: { label: string; path: string }[];
  pageTitle: string;
  pageDescription?: string;
  searchItems: { title: string; path: string }[];
  anchors?: { label: string; href: string }[];
  basePath: string;
  headerLabel?: string;
}) => {
  const hasSidebar = Boolean((nav?.length ?? 0) || (anchors?.length ?? 0));
  const hasToc =
    config.features?.rightToc !== false &&
    config.features?.toc !== false &&
    toc.length > 0;

  return (
    <div
      className={cn(
        "min-h-screen font-sans",
        `theme-${config.theme ?? "mint"}`
      )}
      data-has-dark-logo={config.logo?.dark ? "true" : "false"}
      style={themeStylesFromConfig(config)}
    >
      {renderScripts(config.scripts?.head)}
      <DocHeader
        basePath={basePath}
        config={config}
        label={headerLabel}
        searchItems={searchItems}
      />
      <div className="container-wrapper flex flex-1 flex-col px-2">
        <SidebarProvider
          className={cn(
            "min-h-min flex-1 items-start px-0 [--top-spacing:0] lg:[--top-spacing:calc(var(--spacing)*4)]",
            hasSidebar &&
              "lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]"
          )}
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
            } as React.CSSProperties
          }
        >
          {hasSidebar ? (
            <DocSidebar
              anchors={anchors}
              basePath={basePath}
              currentPath={currentPath}
              entries={nav}
            />
          ) : null}
          <div className="h-full w-full">
            <main
              className={cn(
                "flex scroll-mt-24 items-stretch gap-1 px-4 pb-8 pt-8 lg:px-8",
                !hasSidebar && "mx-auto max-w-[960px]"
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <Breadcrumbs basePath={basePath} breadcrumbs={breadcrumbs} />
                <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                  {pageTitle}
                </h1>
                {pageDescription ? (
                  <p className="mt-3 text-lg text-muted-foreground">
                    {pageDescription}
                  </p>
                ) : null}
                <div className="mt-6 grid gap-4.5 leading-relaxed [&_blockquote]:border-l-3 [&_blockquote]:border-primary [&_blockquote]:pl-3.5 [&_blockquote]:text-muted-foreground [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mt-6 [&_h4]:text-lg [&_h4]:font-semibold [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:border-b [&_td]:border-border [&_td]:px-2.5 [&_td]:py-2 [&_td]:text-left [&_th]:border-b [&_th]:border-border [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_ul]:pl-5">
                  {content}
                </div>
              </div>
              {hasToc ? <DocToc toc={toc} /> : null}
            </main>
          </div>
        </SidebarProvider>
      </div>
      {renderScripts(config.scripts?.body)}
    </div>
  );
};
