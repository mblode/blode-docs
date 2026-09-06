import { ArrowRightIcon } from "blode-icons-react";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { RelativeTime } from "@/components/ui/relative-time";
import { blogPosts } from "@/lib/blog";
import { marketingUrl, pageMetadata } from "@/lib/marketing-site";
import { breadcrumbNode, pageJsonLd, webPageNode } from "@/lib/structured-data";

const blogDescription =
  "Notes, deep dives, and product updates from the Blode.md team: git-native docs, published on merge.";
const blogTitle = "Blog, updates, and product notes";

export const metadata = pageMetadata({
  description: blogDescription,
  path: "/blog",
  title: blogTitle,
});

const blogJsonLd = pageJsonLd(
  webPageNode({
    description: blogDescription,
    extra: {
      hasPart: blogPosts.map((post) => ({
        "@type": "BlogPosting",
        headline: post.title,
        url: marketingUrl(`/blog/${post.slug}`),
      })),
    },
    name: blogTitle,
    path: "/blog",
    type: "CollectionPage",
  }),
  breadcrumbNode([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
  ])
);

export default function BlogPage() {
  return (
    <MarketingShell>
      <JsonLd data={blogJsonLd} />
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container flex flex-col items-center text-center">
          <Badge className="mb-4" variant="outline">
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

      <section className="border-border border-t py-16 md:py-20">
        <div className="container">
          <div className="measure mx-auto text-muted-foreground">
            <p>
              We write here when we ship something worth explaining, when a
              design choice needs context, or when a docs-as-code workflow
              deserves a walkthrough. For step-by-step guides and reference
              material, use the{" "}
              <Link className="underline underline-offset-4" href="/docs">
                docs
              </Link>
              . Release history lives on the{" "}
              <Link className="underline underline-offset-4" href="/changelog">
                changelog
              </Link>
              .
            </p>
            <p className="mt-4">
              If you are new to the product, start with{" "}
              <Link
                className="underline underline-offset-4"
                href="/blog/intro-to-blode-md"
              >
                Hello, Blode.md
              </Link>{" "}
              or browse our{" "}
              <Link
                className="underline underline-offset-4"
                href="/free-online-llms-txt-resources"
              >
                free online llms.txt resources
              </Link>{" "}
              for background on agent-readable docs. Pricing, the changelog, and
              the docs stay linked from here so a post is never the only path
              into the product.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container">
          <ul className="measure mx-auto flex flex-col divide-y divide-border">
            {blogPosts.map((post) => (
              <li key={post.slug}>
                <Link
                  className="group flex flex-col gap-3 py-8 first:pt-0"
                  href={`/blog/${post.slug}`}
                >
                  <RelativeTime
                    className="text-muted-foreground text-sm"
                    date={post.date}
                  />
                  <h2 className="h-display font-bold text-2xl decoration-foreground/40 underline-offset-4 transition-colors group-hover:underline md:text-3xl">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground">{post.excerpt}</p>
                  <span className="inline-flex items-center gap-2 text-muted-foreground text-sm transition-colors group-hover:text-foreground">
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
