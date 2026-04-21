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
      className="flex h-7 items-center text-[13px] text-muted-foreground tracking-[-0.13px] transition-colors hover:text-foreground"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
    </a>
  ) : (
    <Link
      className="flex h-7 items-center text-[13px] text-muted-foreground tracking-[-0.13px] transition-colors hover:text-foreground"
      href={href}
    >
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
      <div className="container @container px-4 pt-14 pb-10 md:px-12">
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 @md:grid-cols-[auto_repeat(3,minmax(0,1fr))] @md:gap-0">
          <Link
            aria-label="Blode.md home"
            className="col-span-2 hidden items-baseline gap-0.5 text-foreground transition-opacity hover:opacity-70 @md:flex @md:col-span-1 @md:px-8"
            href="/"
          >
            <span className="font-semibold text-base tracking-tight">
              Blode
            </span>
            <span className="font-mono text-sm tracking-tight">.md</span>
          </Link>

          {linkGroups.map((group) => (
            <div className="flex flex-col @md:px-8" key={group.label}>
              <h3 className="mb-5 text-[13px] text-foreground tracking-[-0.13px]">
                {group.label}
              </h3>
              <ul className="flex flex-col">
                {group.links.map((link) => (
                  <li key={link.label}>{renderLink(link)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-4 text-[13px] text-muted-foreground tracking-[-0.13px] @md:flex-row @md:items-center @md:justify-between @md:px-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>© {year}</span>
            {legalGroup?.links.map((link) => (
              <Link
                className="transition-colors hover:text-foreground"
                href={link.href}
                key={link.label}
              >
                {link.label}
              </Link>
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
    </footer>
  );
};
