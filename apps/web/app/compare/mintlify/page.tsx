import { ArrowRightIcon } from "blode-icons-react";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { SignupLink } from "@/components/ui/signup-link";
import { siteConfig } from "@/lib/config";
import { marketingUrl, pageMetadata } from "@/lib/marketing-site";
import {
  breadcrumbNode,
  faqPageNode,
  pageJsonLd,
  webPageNode,
} from "@/lib/structured-data";

const PATH = "/compare/mintlify";
const title = "Mintlify alternative for git-native MDX docs";
const description =
  "Blode.md vs Mintlify: both publish MDX from git. Blode.md has no web editor and no marketplace, hosted is $0 with unlimited seats, and the CLI is MIT.";

/** Mintlify facts below were checked against mintlify.com on this date. */
const MINTLIFY_CHECKED_AT = "2026-08-12";

export const metadata = pageMetadata({
  description,
  path: PATH,
  title,
});

interface Row {
  blode: string;
  feature: string;
  mintlify: string;
}

const rows: Row[] = [
  {
    blode: "MDX in your repo. The pull request is the review.",
    feature: "Where docs live",
    mintlify: "MDX in your repo, plus a web editor that commits back.",
  },
  {
    blode: "None. On purpose.",
    feature: "Visual editor",
    mintlify: "Yes, included on Starter.",
  },
  {
    blode: "Merge to main, or `blodemd push` from the terminal.",
    feature: "Publish",
    mintlify: "Merge to main, or save in the web editor.",
  },
  {
    blode: "$0 hosted. Unlimited projects, pages, and seats.",
    feature: "Free tier",
    mintlify: "Starter is $0 with a custom domain and five editor seats.",
  },
  {
    blode: "Included on hosted.",
    feature: "Custom domain, search, OpenAPI reference",
    mintlify: "Included on Starter.",
  },
  {
    blode:
      "llms.txt, llms-full.txt, and a .md twin of every page, written by the same deploy as the HTML.",
    feature: "Markdown for agents",
    mintlify: "llms.txt and Markdown export.",
  },
  {
    blode:
      "No marketplace. Callouts, tabs, code groups, and OpenAPI are built in.",
    feature: "Plugins and integrations",
    mintlify: "Integration marketplace.",
  },
  {
    blode: "MIT CLI and renderer. Same binary on your own Postgres.",
    feature: "Self-host",
    mintlify: "Hosted only.",
  },
  {
    blode: "None. Support is the founder.",
    feature: "SOC 2, SSO, SLA",
    mintlify: "Available on paid tiers.",
  },
];

const faqs = [
  {
    answer:
      "No. The docs.json is similar in spirit, and MDX files move over as files, but the config surface is smaller and some keys do not exist here. Expect to trim the config, not paste it.",
    question: "Is Blode.md a drop-in replacement for Mintlify?",
  },
  {
    answer:
      "Mintlify Starter is also $0 and includes a web editor and five editor seats. The difference is what is left out: Blode.md ships no editor and no marketplace, and its CLI and renderer are MIT so you can run the same thing on your own Postgres.",
    question: "Mintlify has a free tier too. What is actually different?",
  },
  {
    answer:
      "Choose Mintlify if anyone on the team needs to edit docs without a repo, if you want a marketplace, or if you need SOC 2, SSO, or an SLA on a contract. Those are real products and Blode.md does not offer them.",
    question: "When should I pick Mintlify instead?",
  },
  {
    answer:
      "Sign in with GitHub, run blodemd new to scaffold a docs.json, move your MDX files in, and push. Proxy guides for Vercel, Cloudflare, and Nginx cover keeping docs on your own domain under /docs.",
    question: "How do I move from Mintlify to Blode.md?",
  },
];

const jsonLd = pageJsonLd(
  webPageNode({
    description,
    extra: { mainEntity: { "@id": `${marketingUrl(PATH)}#faq` } },
    name: title,
    path: PATH,
  }),
  faqPageNode(PATH, faqs),
  breadcrumbNode([
    { name: "Home", path: "/" },
    { name: "Blode.md vs Mintlify", path: PATH },
  ])
);

export default function CompareMintlifyPage() {
  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4" variant="outline">
            Compare
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Blode.md vs Mintlify
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            Both publish MDX from git. Mintlify adds a web editor and a
            marketplace on top. Blode.md is the git path without either, hosted
            for $0 with unlimited seats, and MIT if you would rather run it
            yourself.
          </p>
          <p className="measure mt-4 text-muted-foreground">
            This is written by the Blode.md founder. Mintlify facts were checked
            on their site on {MINTLIFY_CHECKED_AT}; if something has changed,
            email{" "}
            <a
              className="underline underline-offset-4"
              href={`mailto:${siteConfig.links.email}`}
            >
              {siteConfig.links.email}
            </a>
            .
          </p>
        </div>
      </section>

      <section className="border-border border-t py-16 md:py-20">
        <div className="container">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Feature comparison of Blode.md and Mintlify
              </caption>
              <thead>
                <tr className="border-border border-b">
                  <th className="py-3 pr-4 font-medium" scope="col">
                    Feature
                  </th>
                  <th className="py-3 pr-4 font-medium" scope="col">
                    Blode.md
                  </th>
                  <th className="py-3 font-medium" scope="col">
                    Mintlify
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    className="border-border border-b align-top"
                    key={row.feature}
                  >
                    <th
                      className="py-4 pr-4 font-medium text-foreground"
                      scope="row"
                    >
                      {row.feature}
                    </th>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {row.blode}
                    </td>
                    <td className="py-4 text-muted-foreground">
                      {row.mintlify}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-border border-t py-24 md:py-32">
        <div className="container">
          <div className="grid gap-12 md:grid-cols-2">
            <div className="min-w-0">
              <h2 className="h-display text-balance font-bold text-3xl md:text-4xl">
                Choose Mintlify if
              </h2>
              <ul className="measure mt-6 flex list-disc flex-col gap-3 pl-5 text-muted-foreground">
                <li>Someone on the team writes docs without a repo.</li>
                <li>You want a marketplace of integrations.</li>
                <li>Procurement needs SOC 2, SSO, or an SLA on paper.</li>
                <li>You want a vendor with a support team, not a founder.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h2 className="h-display text-balance font-bold text-3xl md:text-4xl">
                Choose Blode.md if
              </h2>
              <ul className="measure mt-6 flex list-disc flex-col gap-3 pl-5 text-muted-foreground">
                <li>Docs are reviewed in the pull request, and only there.</li>
                <li>
                  You want the Markdown agents read to come from the same commit
                  as the HTML.
                </li>
                <li>Unlimited seats matter more than a second editor.</li>
                <li>
                  You want an MIT escape hatch: the same CLI and renderer on
                  your own Postgres.
                </li>
              </ul>
            </div>
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
        <div className="container flex flex-col items-start gap-6">
          <h2 className="h-display text-balance font-bold text-3xl md:text-4xl">
            The answer they read matches the commit you merged.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <SignupLink location="compare_mintlify">
                Connect GitHub
                <ArrowRightIcon data-icon="inline-end" />
              </SignupLink>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">
                See what you do not get
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
