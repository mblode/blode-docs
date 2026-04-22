import { ArrowRightIcon, CheckIcon } from "blode-icons-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  description:
    "Blode.md ships as an MIT-licensed CLI and renderer. Use the hosted version for zero setup, or self-host on any Postgres and any Node host.",
  title: "Pricing | Blode.md",
};

interface Plan {
  cta: { external?: boolean; href: string; label: string };
  description: string;
  eyebrow: string;
  features: string[];
  note: string;
  recommended?: boolean;
  title: string;
}

const plans: Plan[] = [
  {
    cta: { href: "/oauth/consent", label: "Start shipping" },
    description:
      "Sign in with GitHub and push. Your first docs site is live in about a minute.",
    eyebrow: "Hosted",
    features: [
      "GitHub auto-deploy",
      "Custom domains with SSL",
      "Full-text search",
      "MDX components + API reference",
      "Unlimited team seats",
    ],
    note: "$0 · Unlimited projects, pages, and seats",
    recommended: true,
    title: "Hosted by us",
  },
  {
    cta: {
      external: true,
      href: siteConfig.links.github,
      label: "View on GitHub",
    },
    description:
      "Clone the repo, point it at a Postgres, and run the same CLI we do.",
    eyebrow: "Self-host",
    features: [
      "Full source on GitHub",
      "Same renderer as hosted",
      "Bring your own Postgres",
      "Deploy to Vercel, Fly, Railway, or bare metal",
      "No license keys, no telemetry",
    ],
    note: "MIT licensed · Deploy anywhere Node runs",
    title: "Hosted by you",
  },
];

const faqs = [
  {
    answer:
      "None. Docs your AI depends on should be yours to inspect and own, so the CLI, renderer and API are MIT. Hosting costs us. We'd rather earn trust now and work out paid tiers later.",
    question: "What's the catch?",
  },
  {
    answer:
      "A future hosted tier may charge for team features like SSO and audit logs. The core renderer and CLI stay free.",
    question: "Will it ever cost money?",
  },
  {
    answer:
      "We don't, yet. Sponsor on GitHub if you want to help keep the lights on.",
    question: "How do you make money?",
  },
];

const PlanCard = ({ plan }: { plan: Plan }) => (
  <Card className="h-full justify-start gap-6 py-6">
    <CardHeader className="gap-3">
      <div className="flex items-center gap-2">
        <p className="font-medium text-muted-foreground text-sm">
          {plan.eyebrow}
        </p>
        {plan.recommended ? (
          <Badge className="text-xs" variant="secondary">
            Recommended
          </Badge>
        ) : null}
      </div>
      <CardTitle className="text-3xl md:text-4xl">{plan.title}</CardTitle>
      <p className="text-muted-foreground text-sm">{plan.note}</p>
      <CardDescription className="mt-2 text-base">
        {plan.description}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ul className="flex flex-col gap-2.5 text-sm">
        {plan.features.map((feature) => (
          <li className="flex items-start gap-2.5" key={feature}>
            <CheckIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-foreground/70"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </CardContent>
    <CardContent className="mt-auto pt-2">
      {plan.cta.external ? (
        <Button asChild variant={plan.recommended ? "default" : "outline"}>
          <a href={plan.cta.href} rel="noopener noreferrer" target="_blank">
            {plan.cta.label}
            <ArrowRightIcon data-icon="inline-end" />
          </a>
        </Button>
      ) : (
        <Button asChild variant={plan.recommended ? "default" : "outline"}>
          <Link href={plan.cta.href}>
            {plan.cta.label}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      )}
    </CardContent>
  </Card>
);

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4" variant="outline">
            Pricing
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Open source. Zero seats.
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            The docs your AI runs on shouldn&apos;t be rented. Blode.md is an
            MIT-licensed CLI and renderer. Use the hosted version for zero
            setup, or self-host on any Postgres and any Node host. Same binary
            either way.
          </p>
        </div>
      </section>

      <section className="border-border border-t py-16 md:py-20">
        <div className="container">
          <div className="grid items-stretch gap-6 md:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard key={plan.eyebrow} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-border border-t py-24 md:py-32">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:items-start">
            <div className="min-w-0">
              <p className="mb-4 font-medium text-muted-foreground text-sm">
                Questions
              </p>
              <h2 className="h-display text-balance font-bold text-3xl md:text-4xl">
                Honest answers
              </h2>
            </div>
            <dl className="flex flex-col divide-y divide-border">
              {faqs.map((faq) => (
                <div className="py-6 first:pt-0 last:pb-0" key={faq.question}>
                  <dt className="font-medium text-base">{faq.question}</dt>
                  <dd className="mt-3 text-muted-foreground">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="border-border border-t py-24 md:py-32">
        <div className="container">
          <p className="mb-4 font-medium text-muted-foreground text-sm">
            Ship today
          </p>
          <h2 className="h-display max-w-3xl text-balance font-bold text-3xl md:text-4xl">
            Make the next commit a deploy
          </h2>
          <p className="measure mt-4 text-muted-foreground">
            Sign in with GitHub or clone the repo. Either way, your first docs
            site is live in under a minute.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/oauth/consent">
                Start shipping
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a
                href={siteConfig.links.github}
                rel="noopener noreferrer"
                target="_blank"
              >
                View on GitHub
                <ArrowRightIcon data-icon="inline-end" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
