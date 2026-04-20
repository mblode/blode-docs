import { GithubIcon } from "blode-icons-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
    <footer className="container @container px-4 pt-20 pb-10 text-muted-foreground text-sm">
      <div className="grid grid-cols-2 gap-8 @lg:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-4 @lg:col-span-1">
          <Link
            className="font-semibold text-base text-foreground tracking-tight transition-opacity hover:opacity-80"
            href="/"
          >
            blode.md
          </Link>
          <p className="max-w-xs text-sm">
            Docs your users love. And their AI understands. Ship Markdown from
            GitHub in minutes.
          </p>
          <a
            aria-label="GitHub"
            className="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground"
            href={siteConfig.links.github}
            rel="noopener noreferrer"
            target="_blank"
          >
            <GithubIcon />
          </a>
        </div>
        {linkGroups.map((group) => (
          <div className="flex flex-col gap-3" key={group.label}>
            <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
              {group.label}
            </h3>
            <ul className="flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-12 flex flex-col gap-4 border-border/60 border-t pt-8 @md:flex-row @md:items-center @md:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span>© {year} blode.md</span>
          <span className="hidden text-muted-foreground/60 @md:inline">·</span>
          <a
            className="flex items-center gap-2 rounded-full py-1 transition-colors hover:text-foreground"
            href={siteConfig.links.author}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Image
              alt="Avatar of Matthew Blode"
              className="rounded-full"
              height={20}
              src="/matthew-blode-profile.jpg"
              unoptimized
              width={20}
            />
            Crafted by Matthew Blode
          </a>
          <Badge className="font-mono" variant="outline">
            v{siteConfig.version}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {legalGroup?.links.map((link) => (
            <span key={link.label}>{renderLink(link)}</span>
          ))}
        </div>
      </div>
    </footer>
  );
};
