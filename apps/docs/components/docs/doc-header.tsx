import type { SiteConfig } from "@repo/models";
import Image from "next/image";
import Link from "next/link";

import { MobileNav } from "@/components/docs/mobile-nav";
import { Search } from "@/components/ui/search";
import type { SearchItem } from "@/components/ui/search";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { NavEntry } from "@/lib/navigation";
import { toDocHref } from "@/lib/routes";

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
          >
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
};

// oxlint-disable-next-line eslint/complexity
export const DocHeader = ({
  config,
  searchItems,
  basePath,
  label,
  nav = [],
}: {
  config: SiteConfig;
  searchItems: SearchItem[];
  basePath: string;
  label?: string;
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
            basePath={basePath}
            entries={nav}
            globalLinks={globalLinks}
          />
          <Link
            className="flex items-center gap-2.5"
            href={toDocHref("index", basePath)}
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
          {label ? (
            <span className="ml-4 text-xs uppercase tracking-widest text-muted-foreground">
              {label}
            </span>
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
            {searchDisabled ? null : (
              <Search basePath={basePath} items={searchItems} />
            )}
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
