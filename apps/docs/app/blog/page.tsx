import { ArrowRightIcon } from "blode-icons-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarketingShell } from "@/components/ui/marketing-shell";

export const metadata: Metadata = {
  description:
    "Writing from the blode.md team — notes on docs tooling, MDX, build pipelines, and the craft of writing for developers.",
  title: "Blog — Blode.md",
};

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readingMinutes: number;
  tag: string;
  author: string;
}

const posts: Post[] = [
  {
    author: "Matthew Blode",
    date: "April 10, 2026",
    excerpt:
      "Why the next decade of developer documentation is going to look a lot more like the next decade of code: versioned, reviewed, and shipped on every merge.",
    readingMinutes: 6,
    slug: "docs-belong-in-git",
    tag: "Essay",
    title: "Docs belong in git",
  },
  {
    author: "Matthew Blode",
    date: "March 28, 2026",
    excerpt:
      "A field guide to building MDX pipelines that don't collapse under the weight of custom components, remote content, and fifty plugins.",
    readingMinutes: 11,
    slug: "mdx-without-the-tears",
    tag: "Engineering",
    title: "MDX without the tears",
  },
  {
    author: "Matthew Blode",
    date: "March 15, 2026",
    excerpt:
      "How we ship a unique preview URL for every PR — what's on the build path, what we cache, and how we tear down hosts when a branch is deleted.",
    readingMinutes: 8,
    slug: "preview-deploys-for-docs",
    tag: "Behind the scenes",
    title: "Preview deploys for docs",
  },
  {
    author: "Matthew Blode",
    date: "February 27, 2026",
    excerpt:
      "A short walkthrough of the indexer: how we rebuild it on every deploy, what lives in the client bundle, and why we chose Shiki semantic tokens.",
    readingMinutes: 9,
    slug: "search-on-every-page",
    tag: "Engineering",
    title: "Search on every page, no plugin",
  },
];

export default function BlogPage() {
  return (
    <MarketingShell>
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4 font-mono" variant="outline">
            Blog
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Notes on docs, tooling, and the craft
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            Essays, engineering posts, and field notes from the team building
            blode.md.
          </p>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container">
          <div className="grid gap-4 md:grid-cols-2">
            {posts.map((post) => (
              <Card className="justify-start" key={post.slug}>
                <CardHeader className="gap-3">
                  <div className="flex items-center justify-between">
                    <Badge className="font-mono" variant="outline">
                      {post.tag}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {post.readingMinutes} min read
                    </span>
                  </div>
                  <CardTitle className="font-semibold text-xl">
                    <Link
                      className="transition-colors hover:text-primary"
                      href={`/blog/${post.slug}`}
                    >
                      {post.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="leading-relaxed">
                    {post.excerpt}
                  </CardDescription>
                  <div className="flex items-center justify-between pt-2 text-muted-foreground text-sm">
                    <span>{post.author}</span>
                    <span>{post.date}</span>
                  </div>
                </CardHeader>
                <div className="px-4 pb-2">
                  <Link
                    className="inline-flex items-center gap-1 text-sm transition-colors hover:text-primary"
                    href={`/blog/${post.slug}`}
                  >
                    Read post
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
