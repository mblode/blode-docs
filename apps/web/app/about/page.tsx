import { ArrowRightIcon } from "blode-icons-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  description:
    "blode.md is a docs platform that lives in your git repo. Write MDX, push to main, ship docs.",
  title: "About | Blode.md",
};

export default function AboutPage() {
  return (
    <MarketingShell>
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4 font-mono" variant="outline">
            About
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Docs that live in your repo
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            blode.md turns a folder of MDX into a docs site. Write in your
            editor, commit through a pull request, ship on merge.
          </p>
        </div>
      </section>

      <section className="border-border border-t py-24 md:py-32">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:items-start">
            <div className="min-w-0">
              <Badge className="mb-4 font-mono" variant="outline">
                Why
              </Badge>
              <h2 className="h-display text-balance font-bold text-3xl md:text-4xl">
                Docs belong next to code
              </h2>
            </div>
            <div className="measure flex flex-col gap-6 text-muted-foreground">
              <p>
                A separate CMS pulls writing out of the loop your team already
                runs. The pull request is the review. The merge is the deploy.
                Docs should use the same path.
              </p>
              <p>
                blode.md keeps the surface small on purpose. No plugin
                marketplace, no deep config. If a feature does not move docs
                closer to the code that produced them, it does not ship.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-border border-t py-24 md:py-32">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="h-display font-bold text-xl">Who built it</h3>
              <p className="mt-3 text-muted-foreground">
                blode.md is built by{" "}
                <a
                  className="underline underline-offset-4"
                  href={siteConfig.links.author}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Matthew Blode
                </a>
                .
              </p>
            </div>
            <div>
              <h3 className="h-display font-bold text-xl">Open source</h3>
              <p className="mt-3 text-muted-foreground">
                The source, issues, and releases live on{" "}
                <a
                  className="underline underline-offset-4"
                  href={siteConfig.links.github}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  GitHub
                </a>
                .
              </p>
            </div>
            <div>
              <h3 className="h-display font-bold text-xl">Get in touch</h3>
              <p className="mt-3 text-muted-foreground">
                Email{" "}
                <a
                  className="underline underline-offset-4"
                  href={`mailto:${siteConfig.links.email}`}
                >
                  {siteConfig.links.email}
                </a>
                .
              </p>
            </div>
          </div>
          <div className="mt-12">
            <Button asChild size="lg">
              <Link href="/">
                Back to home
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
