import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/lib/config";

export const SiteFooter = () => (
  <footer className="container px-4 pt-20 pb-10 text-muted-foreground text-sm">
    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
      {siteConfig.footerNav.map((group) => (
        <div className="flex flex-col gap-3" key={group.label}>
          <h3 className="font-mono text-foreground text-xs uppercase tracking-wider">
            {group.label}
          </h3>
          <ul className="flex flex-col gap-2">
            {group.links.map((link) => (
              <li key={link.label}>
                {link.external ? (
                  <a
                    className="transition-colors hover:text-foreground"
                    href={link.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    className="transition-colors hover:text-foreground"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <Separator className="my-10" />
    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
      <div className="flex items-center gap-1">
        Crafted by
        <a
          className="flex items-center gap-2 rounded-full py-1.5 pr-2.5 pl-1.5 transition-colors hover:text-foreground"
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
          Matthew Blode
        </a>
      </div>
      <div className="flex items-center gap-2">
        <Badge className="font-mono" variant="outline">
          v{siteConfig.version}
        </Badge>
        <a
          className="text-muted-foreground transition-colors hover:text-foreground"
          href={siteConfig.links.github}
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub
        </a>
      </div>
    </div>
  </footer>
);
