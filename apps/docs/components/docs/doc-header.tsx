import type { SiteConfig } from "@repo/models";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { NavEntry, NavTab } from "@/lib/navigation";
import { toDocHref } from "@/lib/routes";
import { cn } from "@/lib/utils";

const MobileNav = dynamic(async () => {
  const m = await import("@/components/docs/mobile-nav");
  return { default: m.MobileNav };
});

const Search = dynamic(async () => {
  const m = await import("@/components/ui/search");
  return { default: m.Search };
});

const Dropdown = ({
  label,
  items,
}: {
  label: string;
  items: { label: string; url: string }[];
}) => {
  if (!items.length) {
    return null;
  }
  return (
    <details className="relative">
      <summary className="cursor-pointer rounded-full border border-border bg-background px-3 py-1.5 text-sm">
        {label}
      </summary>
      <div className="absolute right-0 top-11 z-20 grid min-w-36 overflow-hidden rounded-xl border border-border bg-popover shadow-popover">
        {items.map((item) => (
          <Link
            className="px-3 py-2 hover:bg-accent"
            href={item.url}
            key={item.label}
            prefetch={false}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
};

const HeaderTabs = ({
  tabs,
  activeTabIndex = 0,
  basePath,
}: {
  tabs: NavTab[];
  activeTabIndex?: number;
  basePath: string;
}) => (
  <nav
    aria-label="Navigation tabs"
    className="ml-4 hidden items-center gap-0.5 lg:flex"
  >
    {tabs.map((tab, index) => {
      const isActive = index === activeTabIndex;
      const href =
        tab.href ??
        (tab.slugPrefix ? toDocHref(tab.slugPrefix, basePath) : undefined);

      if (!href) {
        return null;
      }

      const isExternal = tab.href?.startsWith("http");

      return (
        <Link
          className={cn(
            "relative px-2.5 py-1.5 text-sm transition-colors",
            isActive
              ? "font-medium text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          href={href}
          key={tab.label}
          rel={isExternal ? "noopener noreferrer" : undefined}
          target={isExternal ? "_blank" : undefined}
          prefetch={false}
        >
          {tab.label}
          {isActive ? (
            <span className="absolute inset-x-1 -bottom-3.5 h-0.5 rounded-full bg-primary" />
          ) : null}
        </Link>
      );
    })}
  </nav>
);

// oxlint-disable-next-line eslint/complexity
export const DocHeader = ({
  config,
  basePath,
  tabs,
  activeTabIndex,
  nav = [],
}: {
  config: SiteConfig;
  basePath: string;
  tabs?: NavTab[] | null;
  activeTabIndex?: number;
  nav?: NavEntry[];
}) => {
  const globalLinks = config.navigation?.global?.links ?? [];
  const versions = config.navigation?.versions ?? [];
  const languages = config.navigation?.languages ?? [];
  const [primaryVersion] = versions;
  const [primaryLanguage] = languages;
  const searchDisabled = config.features?.search === false;
  const themeToggleDisabled = config.features?.themeToggle === false;

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="container-wrapper px-6">
        <div className="flex h-(--header-height) items-center">
          <MobileNav
            activeTabIndex={activeTabIndex}
            basePath={basePath}
            entries={nav}
            globalLinks={globalLinks}
            tabs={tabs}
          />
          <Link
            className="flex items-center gap-2.5"
            href={toDocHref("index", basePath)}
            prefetch={false}
          >
            {config.logo?.light ? (
              <Image
                alt={config.logo.alt ?? config.name}
                className="dark:hidden"
                data-logo="light"
                height={32}
                loading="eager"
                src={config.logo.light}
                unoptimized
                width={140}
              />
            ) : null}
            {config.logo?.dark ? (
              <Image
                alt={config.logo.alt ?? config.name}
                className="hidden dark:inline-block"
                data-logo="dark"
                height={32}
                loading="eager"
                src={config.logo.dark}
                unoptimized
                width={140}
              />
            ) : null}
            {config.logo?.light || config.logo?.dark ? null : (
              <span className="text-xl font-bold">{config.name}</span>
            )}
          </Link>
          {tabs?.length ? (
            <HeaderTabs
              activeTabIndex={activeTabIndex}
              basePath={basePath}
              tabs={tabs}
            />
          ) : null}
          <nav
            aria-label="External links"
            className="hidden items-center gap-0 text-sm text-muted-foreground lg:flex"
          >
            {globalLinks.map((link) => (
              <a
                className="rounded-lg px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
                href={link.href}
                key={link.label}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
            {searchDisabled ? null : <Search basePath={basePath} />}
            {primaryVersion ? (
              <Dropdown items={versions} label={primaryVersion.label} />
            ) : null}
            {primaryLanguage ? (
              <Dropdown items={languages} label={primaryLanguage.label} />
            ) : null}
            {themeToggleDisabled ? null : <ThemeToggle />}
          </div>
        </div>
      </div>
    </header>
  );
};
