import type { Metadata } from "next";

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
    "Security practices at blode.md — TLS by default, GitHub OAuth, encrypted storage, and responsible disclosure.",
  title: "Security — Blode.md",
};

const controls = [
  {
    description:
      "Every site served by blode.md is HTTPS-only. Custom domains get auto-renewed certificates via ACME.",
    title: "TLS everywhere",
  },
  {
    description:
      "We authenticate with GitHub and only request the scopes we need to read the repos you explicitly connect.",
    title: "GitHub OAuth",
  },
  {
    description:
      "Source content, build artifacts, and search indices are encrypted at rest with AES-256.",
    title: "Encrypted at rest",
  },
  {
    description:
      "Internal access is role-scoped, MFA-required, and every production change is logged.",
    title: "Least privilege",
  },
  {
    description:
      "We keep a tight dependency graph and patch upstream CVEs on a 24-hour SLO for high-severity issues.",
    title: "Dependency hygiene",
  },
  {
    description:
      "A documented runbook covers detection, containment, and customer communication. Time-to-notify is under 72 hours.",
    title: "Incident response",
  },
];

export default function SecurityPage() {
  return (
    <MarketingShell>
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4 font-mono" variant="outline">
            Security
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Security you can read in one page
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            Docs platforms hold your source, your drafts, and your customer
            integrations. We treat that with the respect it deserves — and we
            keep the summary short enough to actually read.
          </p>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {controls.map((control) => (
              <Card className="justify-start" key={control.title}>
                <CardHeader>
                  <CardTitle>{control.title}</CardTitle>
                  <CardDescription>{control.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-border border-t py-24 md:py-32">
        <div className="container">
          <div className="max-w-2xl">
            <Badge className="mb-4 font-mono" variant="outline">
              Responsible disclosure
            </Badge>
            <h2 className="h-display text-balance font-bold text-3xl md:text-4xl">
              Found something? Tell us first.
            </h2>
            <p className="mt-4 text-muted-foreground">
              If you believe you&apos;ve found a security vulnerability in
              blode.md, please email{" "}
              <a
                className="underline underline-offset-4"
                href="mailto:security@blode.md"
              >
                security@blode.md
              </a>{" "}
              with a description and reproduction steps. We acknowledge within
              24 hours, triage within 72, and commit to a public writeup once a
              fix has shipped.
            </p>
            <p className="mt-4 text-muted-foreground">
              We do not currently run a paid bug bounty, but we will happily
              credit researchers in release notes and on this page.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
