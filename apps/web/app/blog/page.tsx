import { ArrowRightIcon } from "blode-icons-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  description: "Notes and posts from the team behind blode.md.",
  title: "Blog | Blode.md",
};

export default function BlogPage() {
  return (
    <MarketingShell>
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4 font-mono" variant="outline">
            Blog
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Notes from the repo
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            Nothing posted yet. Follow the GitHub repo for updates.
          </p>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container">
          <Button asChild size="lg" variant="outline">
            <a
              href={siteConfig.links.github}
              rel="noopener noreferrer"
              target="_blank"
            >
              Follow on GitHub
              <ArrowRightIcon data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
}
