import {
  ArrowRightIcon,
  BookIcon,
  CodeIcon,
  GithubIcon,
  LayersTwoIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  WorldIcon,
} from "blode-icons-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { getDashboardHref } from "@/components/ui/site-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { siteConfig } from "@/lib/config";

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

export default async function HomePage() {
  const dashboardHref = await getDashboardHref();
  const isSignedIn = dashboardHref === "/app";

  return (
    <MarketingShell>
      <section className="pb-24 pt-20 md:pb-32 md:pt-28 lg:pt-36">
        <div className="container">
          <Badge className="mb-8 gap-1.5" variant="secondary">
            <SparklesIcon />
            Built for humans and AI
          </Badge>
          <h1 className="h-display max-w-4xl text-balance text-5xl font-bold md:text-7xl lg:text-8xl">
            Docs your users love. And their AI understands.
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            Write MDX, commit, push. blode.md ships a fast, beautiful docs site
            in one git push, wired up for the LLMs your users ask too.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={dashboardHref}>
                {isSignedIn ? "Open dashboard" : "Start from GitHub"}
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
        </div>
      </section>

      <section
        className="border-t border-border py-24 md:py-32"
        id="how-it-works"
      >
        <div className="container">
          <div className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:items-start">
            <div className="min-w-0">
              <Badge className="mb-4 font-mono" variant="outline">
                How it works
              </Badge>
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
                <div className="overflow-hidden rounded-xl bg-surface p-6 font-mono text-sm md:p-8">
                  <ol className="space-y-4">
                    <li className="flex gap-3">
                      <span className="text-muted-foreground">1.</span>
                      <span>
                        Install the GitHub app at{" "}
                        <span className="text-foreground">
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
                      <span>
                        Push to <span className="text-foreground">main</span>,
                        deployed to{" "}
                        <span className="text-foreground">acme.blode.md</span>
                      </span>
                    </li>
                  </ol>
                </div>
              </TabsContent>

              <TabsContent className="mt-6 min-w-0" value="cli">
                <div className="relative overflow-hidden rounded-xl bg-surface p-6 font-mono text-sm md:p-8">
                  <CopyButton
                    className="absolute right-3 top-3 text-muted-foreground"
                    content={`blodemd login\nblodemd new docs\nblodemd push docs`}
                    size="sm"
                    variant="ghost"
                  />
                  <div className="space-y-6">
                    <div>
                      <p className="text-muted-foreground">
                        # browser sign-in with GitHub
                      </p>
                      <p>
                        <span className="text-muted-foreground">$</span> blodemd
                        login
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        # scaffold from your project root
                      </p>
                      <p>
                        <span className="text-muted-foreground">$</span> blodemd
                        new docs
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground"># ship it</p>
                      <p>
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
            <Badge className="mb-4 font-mono" variant="outline">
              What you get
            </Badge>
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
              <Card className="justify-start p-2" key={title}>
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
              <Badge className="mb-4 font-mono" variant="outline">
                On your domain
              </Badge>
              <h2 className="h-display text-balance text-3xl font-bold md:text-4xl">
                Keep docs under the domain your users already trust
              </h2>
              <p className="measure mt-4 text-muted-foreground">
                Proxy /docs through your marketing site so blode.md never looks
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

      <section className="border-t border-border py-24 md:py-32">
        <div className="container" id="get-started">
          <Badge className="mb-4 font-mono" variant="outline">
            Ship today
          </Badge>
          <h2 className="h-display max-w-3xl text-balance text-3xl font-bold md:text-4xl">
            Make the next commit a deploy
          </h2>
          <p className="measure mt-4 text-muted-foreground">
            Sign in with GitHub, pick a repo, pick a template. Your first site
            is live in under a minute, and every push from then on ships itself.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={dashboardHref}>
                {isSignedIn ? "Open dashboard" : "Deploy a site"}
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a
                href={siteConfig.links.github}
                rel="noopener noreferrer"
                target="_blank"
              >
                <GithubIcon data-icon="inline-start" />
                Star on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
