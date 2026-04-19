import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
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
    "How blode.md handles security. HTTPS by default, GitHub OAuth for sign-in, and open source code you can read.",
  title: "Security | Blode.md",
};

const controls = [
  {
    description: "Every site on blode.md is served over HTTPS.",
    title: "HTTPS by default",
  },
  {
    description:
      "Sign-in runs through GitHub OAuth. We request the minimum scopes needed.",
    title: "GitHub OAuth",
  },
  {
    description: "The code is public on GitHub. You can read every line.",
    title: "Open source",
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
            Security
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            A short summary of how we handle security today. The surface is
            small, and we want you to be able to read the whole page.
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
              Reporting an issue
            </Badge>
            <h2 className="h-display text-balance font-bold text-3xl md:text-4xl">
              Found a problem?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Email{" "}
              <a
                className="underline underline-offset-4"
                href={`mailto:${siteConfig.links.email}`}
              >
                {siteConfig.links.email}
              </a>{" "}
              with steps to reproduce. We will take it from there.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
