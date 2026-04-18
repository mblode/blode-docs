import { ArrowRightIcon } from "blode-icons-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { getDashboardHref } from "@/components/ui/site-header";

export const metadata: Metadata = {
  description:
    "Teams shipping docs with every commit. See how engineering teams use blode.md to keep documentation as fresh as their code.",
  title: "Customers — Blode.md",
};

const stories = [
  {
    author: "Priya Natarajan",
    company: "Ledgerline",
    industry: "Fintech API",
    quote:
      "We cut docs drift to zero. Every API change lands in the same PR as the reference update, and it ships the moment we merge.",
    role: "Staff engineer",
  },
  {
    author: "Mateo Herrera",
    company: "Orbital Systems",
    industry: "Developer tooling",
    quote:
      "Before blode.md, our docs were a whole job. Now it's part of code review — the same team, the same workflow.",
    role: "Engineering manager",
  },
  {
    author: "Jess Chen",
    company: "Foundry Labs",
    industry: "Data infrastructure",
    quote:
      "The proxy setup meant we could keep docs under our primary domain without a redirect. Our SEO team stopped complaining.",
    role: "Director of platform",
  },
];

const logoRow = [
  "Ledgerline",
  "Orbital",
  "Foundry",
  "Cumulus",
  "Vertex",
  "Acme",
  "Northwind",
];

export default async function CustomersPage() {
  const dashboardHref = await getDashboardHref();

  return (
    <MarketingShell>
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4 font-mono" variant="outline">
            Customers
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Teams shipping docs with every commit
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            Engineering teams use blode.md to close the gap between code and
            docs — so what ships to production matches what&apos;s on the page.
          </p>
        </div>
      </section>

      <section className="border-border border-t py-16 md:py-20">
        <div className="container">
          <p className="mb-8 font-mono text-muted-foreground text-xs uppercase tracking-wider">
            Shipping with blode.md
          </p>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4 font-mono text-lg text-muted-foreground">
            {logoRow.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-border border-t py-24 md:py-32">
        <div className="container">
          <div className="grid gap-4 md:grid-cols-3">
            {stories.map((story) => (
              <Card className="justify-start" key={story.company}>
                <CardHeader className="gap-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-semibold">
                      {story.company}
                    </CardTitle>
                    <Badge className="font-mono" variant="outline">
                      {story.industry}
                    </Badge>
                  </div>
                  <CardDescription className="text-balance text-foreground text-base leading-relaxed">
                    &ldquo;{story.quote}&rdquo;
                  </CardDescription>
                  <div className="text-muted-foreground text-sm">
                    <p className="font-medium text-foreground">
                      {story.author}
                    </p>
                    <p>{story.role}</p>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-border border-t py-24 md:py-32">
        <div className="container">
          <h2 className="h-display max-w-3xl text-balance font-bold text-3xl md:text-4xl">
            Ship docs with the rest of your release
          </h2>
          <p className="measure mt-4 text-muted-foreground">
            Connect a repo, pick a folder, push to main. Your first site is live
            in under a minute.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={dashboardHref}>
                Start from GitHub
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
