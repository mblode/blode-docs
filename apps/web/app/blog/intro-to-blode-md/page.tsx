import { ArrowRightIcon, ChevronLeftIcon } from "blode-icons-react";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { RelativeTime } from "@/components/ui/relative-time";
import { SignupLink } from "@/components/ui/signup-link";
import { siteConfig } from "@/lib/config";
import { marketingUrl, pageMetadata } from "@/lib/marketing-site";
import {
  articleNode,
  breadcrumbNode,
  pageJsonLd,
  webPageNode,
} from "@/lib/structured-data";

const introDescription =
  "Why we built Blode.md: git-native docs, published on merge. Free, MIT licensed, and designed to keep docs next to the code they describe.";
const introTitle = "Introducing the Blode.md docs platform";
const introPath = "/blog/intro-to-blode-md";

export const metadata = pageMetadata({
  description: introDescription,
  path: introPath,
  title: introTitle,
  type: "article",
});

const introJsonLd = pageJsonLd(
  webPageNode({
    description: introDescription,
    extra: { mainEntity: { "@id": `${marketingUrl(introPath)}#article` } },
    name: introTitle,
    path: introPath,
  }),
  articleNode({
    dateModified: "2026-04-20",
    datePublished: "2026-04-20",
    description: introDescription,
    headline: "Hello, Blode.md",
    path: introPath,
  }),
  breadcrumbNode([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: "Hello, Blode.md", path: introPath },
  ])
);

const installSnippet = `npm i -g blodemd
blodemd login
blodemd new docs
blodemd push docs`;

export default function IntroPostPage() {
  return (
    <MarketingShell>
      <JsonLd data={introJsonLd} />
      <article>
        <section className="pt-20 pb-12 md:pt-28 md:pb-16">
          <div className="container flex flex-col items-center text-center">
            <Link
              className="mb-10 inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
              href="/blog"
            >
              <ChevronLeftIcon />
              All posts
            </Link>
            <Badge className="mb-6" variant="outline">
              Intro
            </Badge>
            <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
              Hello, Blode.md
            </h1>
            <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
              Most docs tools want you to leave your editor. Blode.md
              doesn&apos;t.
            </p>
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 text-muted-foreground text-sm">
              <RelativeTime date="2026-04-20" />
              <span aria-hidden="true">·</span>
              <span>Matthew Blode</span>
            </p>
          </div>
        </section>

        <section className="pb-16 md:pb-24">
          <div className="container">
            <div className="typeset measure mx-auto text-muted-foreground">
              <h2 className="h-display font-bold text-2xl md:text-3xl">
                Why this exists
              </h2>
              <p>
                Existing docs platforms charge per seat or per page. The others
                ask your team to learn a new editor and a new review flow. We
                wanted Markdown in a repo and a URL.
              </p>
              <p>
                Blode.md keeps the surface small on purpose. The pull request is
                the review. The merge is the deploy. Docs use the same path your
                code already does.
              </p>
              <p>
                Hosted docs are free today, with self-hosting available under
                the MIT license. See{" "}
                <Link className="underline underline-offset-4" href="/pricing">
                  pricing
                </Link>{" "}
                for what that includes. We also publish{" "}
                <Link
                  className="underline underline-offset-4"
                  href="/free-online-llms-txt-resources"
                >
                  llms.txt resources
                </Link>{" "}
                so agents can find your docs on the open web.
              </p>

              <h2 className="h-display font-bold text-2xl md:text-3xl">
                What works today
              </h2>
              <p>
                The CLI scaffolds a project, the renderer ships MDX, and the
                GitHub app deploys on every push. Custom domains, full-text
                search, and an interactive API reference are included from day
                one.
              </p>
              <p>Three commands to live:</p>
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

              <h2 className="h-display font-bold text-2xl md:text-3xl">
                What&apos;s next
              </h2>
              <p>
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
                . Open an issue, send a PR, or sponsor: it all helps.
              </p>

              <h2 className="h-display font-bold text-2xl md:text-3xl">
                Try it
              </h2>
              <p>Sign in with GitHub and push. The merge publishes the site.</p>
              <div className="not-typeset mt-6 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <SignupLink location="blog_intro">
                    Connect GitHub
                    <ArrowRightIcon data-icon="inline-end" />
                  </SignupLink>
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
        </section>
      </article>
    </MarketingShell>
  );
}
