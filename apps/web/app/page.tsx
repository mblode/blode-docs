import {
  ArrowRightIcon,
  BookIcon,
  CodeIcon,
  GithubIcon,
  LayersTwoIcon,
  MagnifyingGlassIcon,
  WorldIcon,
} from "blode-icons-react";
import Link from "next/link";

import { AnimatedGroup } from "@/components/ui/animated-group";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { HeroMedia } from "@/components/ui/hero-media";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextEffect } from "@/components/ui/text-effect";

const features = [
  {
    Icon: GithubIcon,
    description: "Install once. Every push to your branch deploys in seconds.",
    title: "GitHub auto-deploy",
  },
  {
    Icon: WorldIcon,
    description:
      "Point a domain, get SSL. Or proxy docs at yourdomain.com/docs.",
    title: "Custom domains",
  },
  {
    Icon: CodeIcon,
    description:
      "30+ components out of the box: callouts, tabs, code groups, API refs.",
    title: "MDX components",
  },
  {
    Icon: MagnifyingGlassIcon,
    description: "Full-text search across every page. No plugin, no config.",
    title: "Search",
  },
  {
    Icon: LayersTwoIcon,
    description:
      "Docs, blogs, changelogs, and courses in one project, one domain.",
    title: "Content types",
  },
  {
    Icon: BookIcon,
    description: "Point at an OpenAPI spec, ship an interactive API reference.",
    title: "API reference",
  },
];

const proxySnippets = {
  caddy: `# Caddyfile
yourdomain.com {
  reverse_proxy /docs/* https://acme.blode.md {
    header_up Host acme.blode.md
  }
}`,
  cloudflare: `// worker.js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/docs')) {
      return fetch(
        \`https://acme.blode.md\${url.pathname.replace('/docs', '')}\`,
      );
    }
    return fetch(request);
  },
};`,
  nginx: `# nginx.conf
location /docs/ {
  proxy_pass https://acme.blode.md/;
  proxy_set_header Host acme.blode.md;
}`,
  vercel: `// next.config.js
async rewrites() {
  return [
    { source: '/docs/:path*',
      destination: 'https://acme.blode.md/:path*' },
  ];
}`,
};

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="pb-16 pt-28 md:pb-24 md:pt-36 lg:pt-44">
        <div className="container flex flex-col items-center text-center">
          <AnimatedGroup
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-3 py-1 text-muted-foreground text-xs backdrop-blur-sm"
            variants={{
              container: {
                hidden: {},
                visible: { transition: { delayChildren: 0.1 } },
              },
            }}
          >
            <span className="inline-block size-1.5 rounded-full bg-foreground/60" />
            <span>Docs that ship with every commit</span>
          </AnimatedGroup>
          <TextEffect
            as="h1"
            className="h-display mx-auto max-w-5xl text-balance text-5xl font-semibold sm:text-6xl md:text-7xl lg:text-[88px]"
            per="word"
            preset="fade-in-blur"
            speedSegment={0.3}
          >
            Docs your users love.
          </TextEffect>
          <TextEffect
            as="p"
            className="h-display mx-auto mt-2 max-w-5xl text-balance text-5xl font-semibold text-muted-foreground sm:text-6xl md:text-7xl lg:text-[88px]"
            delay={0.3}
            per="word"
            preset="fade-in-blur"
            speedSegment={0.3}
          >
            And their AI understands.
          </TextEffect>
          <TextEffect
            as="p"
            className="mx-auto mt-8 max-w-xl text-balance text-base text-muted-foreground md:text-lg"
            delay={0.55}
            per="word"
            preset="fade-in-blur"
            speedSegment={0.2}
          >
            Ship Markdown docs from GitHub in minutes. Versioned, searchable,
            and built so the LLMs your users ask can actually read them.
          </TextEffect>
          <AnimatedGroup
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
            variants={{
              container: {
                hidden: {},
                visible: {
                  transition: {
                    delayChildren: 0.8,
                    staggerChildren: 0.08,
                  },
                },
              },
            }}
          >
            <Button asChild className="h-11 rounded-full px-6" size="lg">
              <Link href="/oauth/consent">Get started free</Link>
            </Button>
            <Button
              asChild
              className="h-11 rounded-full px-6"
              size="lg"
              variant="ghost"
            >
              <Link href="/docs">Read the docs</Link>
            </Button>
          </AnimatedGroup>
        </div>
        <AnimatedGroup
          className="mt-20 md:mt-24"
          variants={{
            container: {
              hidden: {},
              visible: {
                transition: {
                  delayChildren: 0.95,
                  staggerChildren: 0.05,
                },
              },
            },
          }}
        >
          <HeroMedia />
        </AnimatedGroup>
      </section>

      <section
        className="border-t border-border py-24 md:py-32"
        id="how-it-works"
      >
        <div className="container">
          <div className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:items-start">
            <div className="min-w-0">
              <p className="mb-4 text-sm font-medium text-muted-foreground">
                How it works
              </p>
              <h2 className="h-display text-balance text-3xl font-bold md:text-4xl">
                Git in, docs out
              </h2>
              <p className="measure mt-4 text-muted-foreground">
                Point us at a repo from the browser or the terminal, and we
                handle the MDX build, the search index, the domain, and every
                deploy after that. No dashboard to babysit. No pipeline to own.
              </p>
            </div>
            <Tabs className="min-w-0" defaultValue="github">
              <TabsList>
                <TabsTrigger value="github">
                  <GithubIcon data-icon="inline-start" />
                  GitHub
                </TabsTrigger>
                <TabsTrigger value="cli">
                  <CodeIcon data-icon="inline-start" />
                  CLI
                </TabsTrigger>
              </TabsList>

              <TabsContent className="mt-6 min-w-0" value="github">
                <div className="overflow-hidden rounded-xl bg-surface p-6 text-sm md:p-8">
                  <ol className="space-y-4">
                    <li className="flex gap-3">
                      <span className="text-muted-foreground">1.</span>
                      <span className="min-w-0 break-words">
                        Install the GitHub app at{" "}
                        <span className="font-mono text-foreground">
                          github.com/apps/blodemd
                        </span>
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-muted-foreground">2.</span>
                      <span>Pick a repo and a docs folder</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-muted-foreground">3.</span>
                      <span className="min-w-0 break-words">
                        Push to{" "}
                        <span className="font-mono text-foreground">main</span>,
                        deployed to{" "}
                        <span className="font-mono text-foreground">
                          acme.blode.md
                        </span>
                      </span>
                    </li>
                  </ol>
                </div>
              </TabsContent>

              <TabsContent className="mt-6 min-w-0" value="cli">
                <div className="relative overflow-hidden rounded-xl bg-surface p-6 font-mono text-sm md:p-8">
                  <CopyButton
                    className="absolute right-3 top-3 text-muted-foreground"
                    content={`npm i -g blodemd\nblodemd login\nblodemd new docs\nblodemd push docs`}
                    size="sm"
                    variant="ghost"
                  />
                  <div className="space-y-6">
                    <div>
                      <p className="text-muted-foreground"># install the CLI</p>
                      <p className="break-all">
                        <span className="text-muted-foreground">$</span> npm i
                        -g blodemd
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        # browser sign-in with GitHub
                      </p>
                      <p className="break-all">
                        <span className="text-muted-foreground">$</span> blodemd
                        login
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        # scaffold from your project root
                      </p>
                      <p className="break-all">
                        <span className="text-muted-foreground">$</span> blodemd
                        new docs
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground"># ship it</p>
                      <p className="break-all">
                        <span className="text-muted-foreground">$</span> blodemd
                        push docs
                      </p>
                    </div>
                    <p className="text-muted-foreground">
                      Deployed to acme.blode.md
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-24 md:py-32">
        <div className="container">
          <div className="mb-12 max-w-2xl">
            <p className="mb-4 text-sm font-medium text-muted-foreground">
              What you get
            </p>
            <h2 className="h-display text-balance text-3xl font-bold md:text-4xl">
              Every piece of a modern docs site, included
            </h2>
            <p className="measure mt-4 text-muted-foreground">
              One MDX project, one domain, one price. The components,
              infrastructure, and workflow are already taken care of, so you can
              spend your time on the writing.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ Icon, title, description }) => (
              <Card className="justify-start" key={title}>
                <CardHeader>
                  <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon />
                  </div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-24 md:py-32">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:items-start">
            <div className="min-w-0">
              <p className="mb-4 text-sm font-medium text-muted-foreground">
                On your domain
              </p>
              <h2 className="h-display text-balance text-3xl font-bold md:text-4xl">
                Keep docs under the domain your users already trust
              </h2>
              <p className="measure mt-4 text-muted-foreground">
                Proxy /docs through your marketing site so Blode.md never looks
                like a detour. Ready-made configs for Vercel, Cloudflare, Nginx,
                and Caddy. Paste in, ship it.
              </p>
              <div className="mt-6">
                <Button asChild variant="outline">
                  <Link href="/docs/guides/proxy-vercel">
                    Read the proxy guides
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </div>
            <Tabs className="min-w-0" defaultValue="vercel">
              <TabsList className="max-w-full overflow-x-auto no-scrollbar">
                <TabsTrigger value="vercel">Vercel</TabsTrigger>
                <TabsTrigger value="cloudflare">Cloudflare</TabsTrigger>
                <TabsTrigger value="nginx">Nginx</TabsTrigger>
                <TabsTrigger value="caddy">Caddy</TabsTrigger>
              </TabsList>
              {Object.entries(proxySnippets).map(([key, snippet]) => (
                <TabsContent className="mt-6 min-w-0" key={key} value={key}>
                  <div className="relative min-w-0">
                    <CopyButton
                      className="absolute right-3 top-3 text-muted-foreground"
                      content={snippet}
                      size="sm"
                      variant="ghost"
                    />
                    <pre className="overflow-x-auto rounded-xl bg-surface p-6 font-mono text-sm md:p-8">
                      {snippet}
                    </pre>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-28 md:py-40">
        <div
          className="container flex flex-col items-center text-center"
          id="get-started"
        >
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-3 py-1 text-muted-foreground text-xs">
            <span className="inline-block size-1.5 rounded-full bg-foreground/60" />
            Ship today
          </p>
          <h2 className="h-display mx-auto max-w-4xl text-balance text-5xl font-semibold md:text-6xl lg:text-7xl">
            Make the next commit{" "}
            <span className="text-muted-foreground">a deploy.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-balance text-muted-foreground md:text-lg">
            Sign in with GitHub, pick a repo, pick a template. Your first site
            is live in under a minute, and every push from then on ships itself.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="h-11 rounded-full px-6" size="lg">
              <Link href="/oauth/consent">Get started free</Link>
            </Button>
            <Button
              asChild
              className="h-11 rounded-full px-6"
              size="lg"
              variant="ghost"
            >
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
