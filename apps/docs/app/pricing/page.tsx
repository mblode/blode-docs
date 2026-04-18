import { ArrowRightIcon, CheckIcon } from "blode-icons-react";
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
    "Simple, developer-friendly pricing. Free for side projects, Pro for small teams, Team for companies shipping docs at scale.",
  title: "Pricing — Blode.md",
};

const tiers = [
  {
    cta: "Start free",
    description:
      "For side projects, open source, and early-stage ideas shipping their first docs.",
    features: [
      "1 project, 1 custom domain",
      "Unlimited contributors",
      "MDX components, search, API reference",
      "GitHub auto-deploy",
      "Community support",
    ],
    name: "Free",
    price: "$0",
    unit: "forever",
  },
  {
    cta: "Start 14-day trial",
    description:
      "For small teams who need more projects, more domains, and less guesswork.",
    featured: true,
    features: [
      "Up to 10 projects",
      "Custom domains with auto SSL",
      "Preview deploys on every PR",
      "Password-protected docs",
      "Email support",
    ],
    name: "Pro",
    price: "$20",
    unit: "per editor / month",
  },
  {
    cta: "Contact sales",
    description:
      "For companies running public docs, internal portals, and everything in between.",
    features: [
      "Unlimited projects and domains",
      "SSO (SAML, OIDC)",
      "Audit logs and role-based access",
      "Custom SLA and uptime guarantee",
      "Dedicated support channel",
    ],
    name: "Team",
    price: "Custom",
    unit: "billed annually",
  },
];

export default async function PricingPage() {
  const dashboardHref = await getDashboardHref();

  return (
    <MarketingShell>
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4 font-mono" variant="outline">
            Pricing
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Pricing that scales with your docs, not your headcount
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            Start free. Upgrade when you need previews, custom domains, or audit
            logs. No per-page, per-build, or per-visitor surprises.
          </p>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container">
          <div className="grid gap-4 md:grid-cols-3">
            {tiers.map((tier) => (
              <Card
                className={
                  tier.featured
                    ? "justify-start ring-2 ring-primary"
                    : "justify-start"
                }
                key={tier.name}
              >
                <CardHeader className="gap-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-semibold text-lg">
                      {tier.name}
                    </CardTitle>
                    {tier.featured ? (
                      <Badge variant="secondary">Most popular</Badge>
                    ) : null}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="h-display font-bold text-3xl">
                      {tier.price}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {tier.unit}
                    </span>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <ul className="flex flex-col gap-2 px-4 text-sm">
                  {tier.features.map((feature) => (
                    <li className="flex items-start gap-2" key={feature}>
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="px-4 pb-2">
                  <Button
                    asChild
                    className="w-full"
                    variant={tier.featured ? "default" : "outline"}
                  >
                    <Link
                      href={
                        tier.name === "Team"
                          ? "mailto:hello@blode.md"
                          : dashboardHref
                      }
                    >
                      {tier.cta}
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-border border-t py-24 md:py-32">
        <div className="container">
          <div className="max-w-2xl">
            <Badge className="mb-4 font-mono" variant="outline">
              Questions
            </Badge>
            <h2 className="h-display text-balance font-bold text-3xl md:text-4xl">
              Frequently asked
            </h2>
          </div>
          <dl className="mt-10 grid gap-8 md:grid-cols-2">
            <div>
              <dt className="font-medium">Do unused seats roll over?</dt>
              <dd className="mt-2 text-muted-foreground">
                Seats are billed per active editor per month. Viewers are always
                free and unlimited on every tier.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Can I self-host?</dt>
              <dd className="mt-2 text-muted-foreground">
                The CLI and MDX runtime are MIT licensed. The managed build,
                search, and domain layer is cloud-only today.
              </dd>
            </div>
            <div>
              <dt className="font-medium">What counts as a project?</dt>
              <dd className="mt-2 text-muted-foreground">
                One repo + one folder + one domain. A monorepo with five docs
                folders is five projects.
              </dd>
            </div>
            <div>
              <dt className="font-medium">
                Is there a discount for open source?
              </dt>
              <dd className="mt-2 text-muted-foreground">
                Yes — public repos with an OSI-approved license run on Pro for
                free. Email{" "}
                <a
                  className="underline underline-offset-4"
                  href="mailto:oss@blode.md"
                >
                  oss@blode.md
                </a>
                .
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </MarketingShell>
  );
}
