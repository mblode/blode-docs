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
    "Start from a template — docs sites, changelogs, API references, and blogs. Every template is a GitHub repo you own on day one.",
  title: "Templates — Blode.md",
};

const templates = [
  {
    category: "Docs",
    description:
      "Opinionated multi-section docs with sidebar navigation, search, and a homepage hero.",
    name: "Starter docs",
    repo: "blodemd/template-docs",
  },
  {
    category: "Changelog",
    description:
      "Dated entries, tag filters, RSS feed, and anchor links — ready for product updates.",
    name: "Changelog",
    repo: "blodemd/template-changelog",
  },
  {
    category: "API",
    description:
      "Point at an OpenAPI 3.1 spec and ship an interactive, syntax-highlighted reference.",
    name: "OpenAPI reference",
    repo: "blodemd/template-openapi",
  },
  {
    category: "Blog",
    description:
      "Author-friendly blog with tags, RSS, reading time, and MDX-powered post layouts.",
    name: "Engineering blog",
    repo: "blodemd/template-blog",
  },
  {
    category: "Course",
    description:
      "Chaptered MDX pages with progress tracking — ideal for tutorials and onboarding.",
    name: "Course",
    repo: "blodemd/template-course",
  },
  {
    category: "Handbook",
    description:
      "Internal handbook format — team docs, runbooks, and policies with search baked in.",
    name: "Internal handbook",
    repo: "blodemd/template-handbook",
  },
];

export default async function TemplatesPage() {
  const dashboardHref = await getDashboardHref();

  return (
    <MarketingShell>
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4 font-mono" variant="outline">
            Templates
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Pick a template. Ship in a minute.
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            Every template is a real GitHub repo. Fork it, clone it, point
            blode.md at it — your first deploy is live before coffee.
          </p>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card className="justify-start" key={template.repo}>
                <CardHeader className="gap-3">
                  <Badge className="w-fit font-mono" variant="outline">
                    {template.category}
                  </Badge>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <div className="flex items-center gap-2 px-4 pb-2">
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={`https://github.com/${template.repo}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      View on GitHub
                    </a>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={dashboardHref}>
                      Use template
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
