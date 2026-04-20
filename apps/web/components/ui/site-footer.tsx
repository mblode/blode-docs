import { GithubIcon } from "blode-icons-react";
import Link from "next/link";

import { siteConfig } from "@/lib/config";

const renderLink = ({
  label,
  href,
  external,
}: {
  label: string;
  href: string;
  external?: boolean;
}) =>
  external ? (
    <a
      className="transition-colors hover:text-foreground"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
    </a>
  ) : (
    <Link className="transition-colors hover:text-foreground" href={href}>
      {label}
    </Link>
  );

export const SiteFooter = () => {
  const legalGroup = siteConfig.footerNav.find(
    (group) => group.label === "Legal"
  );
  const linkGroups = siteConfig.footerNav.filter(
    (group) => group.label !== "Legal"
  );
  const year = new Date().getFullYear();

  return (
    <footer className="border-border/60 border-t">
      <div className="container @container px-4 pt-24 pb-10 text-muted-foreground text-sm">
        <div className="grid grid-cols-1 gap-10 @md:grid-cols-3 @md:gap-8">
          {linkGroups.map((group) => (
            <div className="flex flex-col gap-3" key={group.label}>
              <h3 className="font-medium text-foreground text-xs uppercase tracking-[0.12em]">
                {group.label}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>{renderLink(link)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-4 border-border/60 border-t pt-8 @md:flex-row @md:items-center @md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>© {year}</span>
            {legalGroup?.links.map((link) => (
              <span key={link.label}>{renderLink(link)}</span>
            ))}
          </div>
          <a
            aria-label="GitHub"
            className="inline-flex size-8 items-center justify-center rounded-full border border-border/80 transition-colors hover:bg-muted hover:text-foreground"
            href={siteConfig.links.github}
            rel="noopener noreferrer"
            target="_blank"
          >
            <GithubIcon />
          </a>
        </div>
      </div>

      <Link
        aria-label="Blode.md home"
        className="block border-border/60 border-t transition-opacity hover:opacity-80"
        href="/"
      >
        <div
          aria-hidden
          className="h-display container select-none px-4 py-8 text-center font-semibold text-[22vw] text-foreground/[0.08] leading-[0.8] md:py-12 md:text-[18rem]"
        >
          Blode.md
        </div>
      </Link>
    </footer>
  );
};
