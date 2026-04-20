import { ArrowRightIcon } from "blode-icons-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MarketingShell } from "@/components/ui/marketing-shell";

export const metadata: Metadata = {
  description: "Notes and posts from the team behind Blode.md.",
  title: "Blog | Blode.md",
};

const posts = [
  {
    date: "2026-04-20",
    excerpt:
      "Why we built a docs platform that publishes from GitHub in three commands.",
    formattedDate: "April 20, 2026",
    slug: "intro-to-blode-md",
    title: "Hello, Blode.md",
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
            Notes from the repo
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            Updates, decisions, and ship notes from the team behind Blode.md.
          </p>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container">
          <ul className="flex flex-col divide-y divide-border">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  className="group flex flex-col gap-3 py-8 transition-colors first:pt-0"
                  href={`/blog/${post.slug}`}
                >
                  <time
                    className="text-muted-foreground text-sm"
                    dateTime={post.date}
                  >
                    {post.formattedDate}
                  </time>
                  <h2 className="h-display font-bold text-2xl transition-colors group-hover:text-primary md:text-3xl">
                    {post.title}
                  </h2>
                  <p className="measure text-muted-foreground">
                    {post.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm transition-colors group-hover:text-primary">
                    Read post
                    <ArrowRightIcon data-icon="inline-end" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </MarketingShell>
  );
}
