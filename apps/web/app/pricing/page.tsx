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
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  description:
    "Blode.md is free and open source under MIT. Use the hosted version, self-host on your own infra, or fork it.",
  title: "Pricing | Blode.md",
};

const plans = [
  {
    cta: { href: "/oauth/consent", label: "Start shipping" },
    description:
      "Sign in with GitHub. Push docs from any repo. Custom domains, search, API reference, and MDX components are all included.",
    eyebrow: "Hosted",
    note: "We run the infra. You write the docs.",
    title: "Free",
  },
  {
    cta: {
      external: true,
      href: siteConfig.links.github,
      label: "View on GitHub",
    },
    description:
      "Clone the repo, point it at your Postgres, deploy anywhere Node runs. Same renderer, same CLI.",
    eyebrow: "Self-host",
    note: "MIT licensed. Fork it, ship it.",
    title: "Free",
  },
];

const faqs = [
  {
    answer:
      "None. The CLI, renderer, and API are MIT. Hosting costs us, but we'd rather earn trust now and figure out paid tiers later.",
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

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4 font-mono" variant="outline">
            Pricing
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Free. Forever.
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            Blode.md is open source under MIT. Use the hosted version, self-host
            on your own infra, or fork it. No seats, no page limits, no upsell.
          </p>
        </div>
      </section>

      <section className="border-border border-t py-24 md:py-32">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-2">
            {plans.map((plan) => (
              <Card className="justify-start p-2" key={plan.eyebrow}>
                <CardHeader>
                  <p className="mb-2 font-medium text-muted-foreground text-sm">
                    {plan.eyebrow}
                  </p>
                  <CardTitle className="text-3xl md:text-4xl">
                    {plan.title}
                  </CardTitle>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {plan.note}
                  </p>
                  <CardDescription className="mt-4 text-base">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-6">
                    {plan.cta.external ? (
                      <Button asChild>
                        <a
                          href={plan.cta.href}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {plan.cta.label}
                          <ArrowRightIcon data-icon="inline-end" />
                        </a>
                      </Button>
                    ) : (
                      <Button asChild>
                        <Link href={plan.cta.href}>
                          {plan.cta.label}
                          <ArrowRightIcon data-icon="inline-end" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>
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
            <div className="rounded-[calc(var(--radius)+0.375rem)] border border-border/70 bg-foreground/5 p-0.5">
              <Button asChild size="lg">
                <Link href="/oauth/consent">
                  Start shipping
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </div>
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
