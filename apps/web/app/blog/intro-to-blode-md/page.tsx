import { ArrowLeftIcon, ArrowRightIcon } from "blode-icons-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  description:
    "Why we built blode.md — a docs-as-code platform that publishes from GitHub in three commands, free and open source.",
  title: "Hello, blode.md | Blode.md",
};

const installSnippet = `npm i -g blodemd
blodemd login
blodemd new docs
blodemd push docs`;

export default function IntroPostPage() {
  return (
    <MarketingShell>
      <article>
        <section className="pt-20 pb-12 md:pt-28 md:pb-16">
          <div className="container">
            <Link
              className="mb-8 inline-flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
              href="/blog"
            >
              <ArrowLeftIcon />
              All posts
            </Link>
            <Badge className="mb-4 font-mono" variant="outline">
              Intro
            </Badge>
            <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
              Hello, blode.md
            </h1>
            <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
              Most docs tools want you to leave your editor. blode.md
              doesn&apos;t.
            </p>
            <p className="mt-6 text-muted-foreground text-sm">
              <time dateTime="2026-04-20">April 20, 2026</time> · The blode.md
              team
            </p>
          </div>
        </section>

        <section className="pb-16 md:pb-24">
          <div className="container">
            <div className="measure flex flex-col gap-10 text-base leading-relaxed">
              <div className="flex flex-col gap-4">
                <h2 className="h-display font-bold text-2xl md:text-3xl">
                  Why this exists
                </h2>
                <p className="text-muted-foreground">
                  Existing docs platforms charge per seat or per page. The
                  others ask your team to learn a new editor and a new review
                  flow. We wanted Markdown in a repo and a URL.
                </p>
                <p className="text-muted-foreground">
                  blode.md keeps the surface small on purpose. The pull request
                  is the review. The merge is the deploy. Docs use the same path
                  your code already does.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <h2 className="h-display font-bold text-2xl md:text-3xl">
                  What works today
                </h2>
                <p className="text-muted-foreground">
                  The CLI scaffolds a project, the renderer ships MDX, and the
                  GitHub app deploys on every push. Custom domains, full-text
                  search, and an interactive API reference are included from day
                  one.
                </p>
                <p className="text-muted-foreground">Three commands to live:</p>
                <div className="relative">
                  <CopyButton
                    className="absolute top-3 right-3 text-muted-foreground"
                    content={installSnippet}
                    size="sm"
                    variant="ghost"
                  />
                  <pre className="overflow-x-auto rounded-xl bg-surface p-6 font-mono text-sm md:p-8">
                    {installSnippet}
                  </pre>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h2 className="h-display font-bold text-2xl md:text-3xl">
                  What&apos;s next
                </h2>
                <p className="text-muted-foreground">
                  Themes, analytics, and team accounts are next on the list.
                  Issues and roadmap live on{" "}
                  <a
                    className="underline underline-offset-4"
                    href={siteConfig.links.github}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    GitHub
                  </a>
                  . Open an issue, send a PR, or sponsor — it all helps.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <h2 className="h-display font-bold text-2xl md:text-3xl">
                  Try it
                </h2>
                <p className="text-muted-foreground">
                  Sign in with GitHub and your first site is live in under a
                  minute.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg">
                    <Link href="/oauth/consent">
                      Start shipping
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost">
                    <Link href="/docs">
                      Read the docs
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </article>
    </MarketingShell>
  );
}
