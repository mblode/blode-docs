import { ArrowRightIcon } from "blode-icons-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/ui/marketing-shell";

export const metadata: Metadata = {
  description:
    "Blode.md is a small team building a docs platform that treats documentation like code — versioned in git, reviewed in PRs, shipped on every push.",
  title: "About — Blode.md",
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
            Docs should ship as fast as code
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            We started blode.md because writing great docs shouldn&apos;t mean
            running a second CMS, maintaining a second pipeline, or owning a
            second workflow. Great docs belong next to the code they describe.
          </p>
        </div>
      </section>

      <section className="border-border border-t py-24 md:py-32">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:items-start">
            <div className="min-w-0">
              <Badge className="mb-4 font-mono" variant="outline">
                Method
              </Badge>
              <h2 className="h-display text-balance font-bold text-3xl md:text-4xl">
                How we build
              </h2>
            </div>
            <div className="measure flex flex-col gap-6 text-muted-foreground">
              <p>
                Docs should be the same artifact as code — a file in a repo, a
                line in a diff, a comment on a pull request. Anything that pulls
                writing out of that loop is friction, and friction is why docs
                go stale.
              </p>
              <p>
                We keep the surface area small on purpose. One project, one
                domain, one price. No plugin marketplace, no six-level config
                schema. If a feature doesn&apos;t move docs closer to the code
                that produced them, we don&apos;t ship it.
              </p>
              <p>
                The MDX runtime, the CLI, and the component library are open
                source. The build, search, and domain infrastructure is
                cloud-managed so you don&apos;t have to babysit a pipeline to
                publish a page.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-border border-t py-24 md:py-32">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h3 className="h-display font-bold text-xl">Work with us</h3>
              <p className="mt-3 text-muted-foreground">
                We&apos;re a small, fully-remote team. If what we&apos;re
                building sounds right, we&apos;d love to hear from you at{" "}
                <a
                  className="underline underline-offset-4"
                  href="mailto:hello@blode.md"
                >
                  hello@blode.md
                </a>
                .
              </p>
            </div>
            <div>
              <h3 className="h-display font-bold text-xl">Press and brand</h3>
              <p className="mt-3 text-muted-foreground">
                Logos, wordmarks, and usage guidelines are on GitHub. Feel free
                to link, screenshot, and embed — just keep the spacing.
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
