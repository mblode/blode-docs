import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  description:
    "Product updates, releases, and ship notes from the blode.md team. New components, infrastructure changes, and features as they land.",
  title: "Changelog — Blode.md",
};

interface Release {
  version: string;
  date: string;
  tag?: "feature" | "fix" | "improvement";
  title: string;
  body: string[];
}

const releases: Release[] = [
  {
    body: [
      "Every open PR now gets a unique preview URL (pr-42.acme.blode.md). The URL is posted back as a PR comment, and it tears down automatically when the branch is deleted.",
      "Works with monorepos: each docs folder gets its own preview host.",
    ],
    date: "April 14, 2026",
    tag: "feature",
    title: "Preview deploys on every pull request",
    version: "0.0.9",
  },
  {
    body: [
      "Point the API reference at a spec and we'll render operations, schemas, and examples inline.",
      "Added authorization-aware examples, code samples in JavaScript, Python, and curl.",
    ],
    date: "April 2, 2026",
    tag: "feature",
    title: "OpenAPI 3.1 support",
    version: "0.0.8",
  },
  {
    body: [
      "Rebuilt the search indexer around Shiki's semantic tokens. Indexing is now ~4× faster on projects with 500+ pages.",
      "No config change required — the new indexer ships to every project automatically.",
    ],
    date: "March 20, 2026",
    tag: "improvement",
    title: "Faster search indexing",
    version: "0.0.7",
  },
  {
    body: [
      "Ready-made configs for the most common reverse proxies. Paste in, ship — keep docs under yourdomain.com/docs.",
    ],
    date: "March 3, 2026",
    tag: "feature",
    title: "Proxy guides for Vercel, Cloudflare, Nginx, and Caddy",
    version: "0.0.6",
  },
  {
    body: [
      "Fixed a race condition where ACME certs would occasionally fail to issue for domains added within the same minute.",
      "Added a retry path with exponential backoff.",
    ],
    date: "February 14, 2026",
    tag: "fix",
    title: "Custom domain SSL provisioning",
    version: "0.0.5",
  },
];

const tagVariant: Record<
  NonNullable<Release["tag"]>,
  "default" | "secondary" | "success"
> = {
  feature: "default",
  fix: "secondary",
  improvement: "success",
};

export default function ChangelogPage() {
  return (
    <MarketingShell>
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4 font-mono" variant="outline">
            Changelog
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            What shipped, and when
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            A running log of releases, improvements, and fixes.
          </p>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container">
          <ol className="flex flex-col gap-12">
            {releases.map((release, index) => (
              <li className="flex flex-col gap-4" key={release.version}>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="font-mono" variant="outline">
                    v{release.version}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    {release.date}
                  </span>
                  {release.tag ? (
                    <Badge variant={tagVariant[release.tag]}>
                      {release.tag}
                    </Badge>
                  ) : null}
                </div>
                <h2 className="h-display text-balance font-bold text-2xl md:text-3xl">
                  {release.title}
                </h2>
                <div className="measure flex flex-col gap-3 text-muted-foreground">
                  {release.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {index < releases.length - 1 ? (
                  <Separator className="mt-4" />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </MarketingShell>
  );
}
