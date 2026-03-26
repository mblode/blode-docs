import type { SiteConfig } from "@repo/models";
import Image from "next/image";
import Link from "next/link";

import { Search } from "@/components/ui/search";
import type { SearchItem } from "@/components/ui/search";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
    <details className="doc-dropdown">
      <summary>{label}</summary>
      <div className="doc-dropdown__menu">
        {items.map((item) => (
          <Link href={item.url} key={item.label}>
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
}: {
  config: SiteConfig;
  searchItems: SearchItem[];
  basePath: string;
  label?: string;
}) => {
  const globalLinks = config.navigation?.global?.links ?? [];
  const versions = config.navigation?.versions ?? [];
  const languages = config.navigation?.languages ?? [];
  const [primaryVersion] = versions;
  const [primaryLanguage] = languages;
  const searchDisabled = config.features?.search === false;
  const themeToggleDisabled = config.features?.themeToggle === false;

  return (
    <header className="doc-header">
      <div className="doc-header__brand">
        <Link className="doc-brand" href={toDocHref("index", basePath)}>
          {config.logo?.light ? (
            <Image
              alt={config.logo.alt ?? config.name}
              className="doc-brand__logo doc-brand__logo--light"
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
              className="doc-brand__logo doc-brand__logo--dark"
              height={32}
              loading="eager"
              src={config.logo.dark}
              unoptimized
              width={140}
            />
          ) : null}
          {config.logo?.light || config.logo?.dark ? null : (
            <span className="doc-brand__text">{config.name}</span>
          )}
        </Link>
        <span className="doc-header__tagline">{label ?? "Docs"}</span>
      </div>
      <nav className="doc-header__nav">
        {globalLinks.map((link) => (
          <a
            href={link.href}
            key={link.label}
            rel="noopener noreferrer"
            target="_blank"
          >
            {link.label}
          </a>
        ))}
      </nav>
      <div className="doc-header__actions">
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
    </header>
  );
};
