import { ArrowRightIcon } from "blode-icons-react";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { SignupLink } from "@/components/ui/signup-link";
import { marketingUrl, pageMetadata } from "@/lib/marketing-site";
import {
  breadcrumbNode,
  faqPageNode,
  pageJsonLd,
  webPageNode,
} from "@/lib/structured-data";

const PATH = "/docs-as-code";
const title = "Docs as code: MDX in git, published on merge";
const description =
  "Keep docs as MDX in the repo, review them in the pull request, and let the merge publish the site plus the Markdown agents read.";

export const metadata = pageMetadata({
  description,
  path: PATH,
  title,
});

const faqs = [
  {
    answer:
      "Yes. Unlimited projects, pages, and seats, with custom domains, search, MDX, and OpenAPI references included. What pays for it is what is left out: no web editor, no marketplace, no SOC 2, and support is the founder.",
    question: "Is hosted Blode.md really $0?",
  },
  {
    answer:
      "The CLI and renderer are MIT, so you can run the same thing on your own Postgres. Your docs are files in your repo either way, so nothing is locked in the host.",
    question: "What if Blode.md shuts down?",
  },
  {
    answer:
      "Yes. The deploy that renders the HTML also writes llms.txt, llms-full.txt, and a .md twin of every page. They cannot lag the site because they are the same build.",
    question:
      "Does the Markdown agents read come from the same commit as the site?",
  },
  {
    answer:
      "Yes. blodemd push docs publishes from the terminal, which suits a preview or a repo without the GitHub App. The merge path is the one I recommend, because it ties every publish to a reviewed commit.",
    question: "Can I publish without merging to main?",
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
    { name: "Docs as code", path: PATH },
  ])
);

const externalLink = "underline underline-offset-4";

export default function DocsAsCodePage() {
  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4" variant="outline">
            Docs as code
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Docs as code, hosted
          </h1>
          <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
            Docs as code, sometimes written documentation as code, means the
            documentation is Markdown or MDX files in the product repository. A
            doc change is a commit, the review is the pull request, and the
            merge is the publish. There is no second editor and no separate
            publish step to forget.
          </p>
          <p className="measure mt-4 text-muted-foreground">
            Blode.md hosts that workflow and nothing else. I am the founder, and
            this page is how I would decide whether it fits your team.
          </p>
        </div>
      </section>

      <section className="border-border border-t py-16 md:py-20">
        <div className="container">
          <div className="typeset measure text-muted-foreground">
            <h2
              className="h-display font-bold text-2xl md:text-3xl"
              id="review-decision"
            >
              Why the workflow matters more than the host
            </h2>
            <p>
              The{" "}
              <a
                className={externalLink}
                href="https://www.writethedocs.org/guide/docs-as-code/"
                rel="noopener noreferrer"
                target="_blank"
              >
                Write the Docs guide
              </a>{" "}
              defines docs as code as using the tools engineers already use:
              version control, plain text, code review, automated builds. All of
              that tooling follows from one decision. Docs change in the same
              pull request as the code.
            </p>
            <p>
              Once that holds, drift stops being a process problem. A reviewer
              who sees a new flag with no doc change can ask for it before the
              merge, not after a customer finds it. If the decision does not
              hold, no host fixes it. Pick the workflow first, then the host.
            </p>

            <h2
              className="h-display font-bold text-2xl md:text-3xl"
              id="wrong-choice"
            >
              When is docs as code the wrong choice for my team?
            </h2>
            <p>
              When someone who writes docs does not work in git and is not going
              to. A support lead, a marketer, a technical writer who reviews in
              a browser. When an approval has to happen outside GitHub. When the
              people who own the docs are not the people who own the code.
            </p>
            <p>
              A docs CMS such as GitBook or Notion is the right tool for that
              team, and choosing it is not a failure. If that is your team, stop
              here.
            </p>

            <h2
              className="h-display font-bold text-2xl md:text-3xl"
              id="host-vs-cms"
            >
              How is a docs-as-code host different from GitBook or Notion?
            </h2>
            <p>
              A docs CMS is the editor and the store. Writing happens in the
              browser, history lives in the CMS, and git is at most a sync. A
              docs-as-code host is a renderer for MDX documentation. It takes
              the files at one commit and serves them. The editor is yours, the
              history is git, and the host holds nothing you could not rebuild
              from the repo.
            </p>
            <p>
              That is the whole difference, and it is why the hosting can be $0:
              it is a build step with a URL. Mintlify sits between the two, the
              git path plus a web editor that commits back. That comparison has{" "}
              <Link className={externalLink} href="/compare/mintlify">
                its own page
              </Link>
              .
            </p>

            <h2
              className="h-display font-bold text-2xl md:text-3xl"
              id="own-domain"
            >
              Can I keep docs on my own domain under /docs?
            </h2>
            <p>
              Yes. Custom domains are included on hosted. If brand or SEO will
              not let docs live on a separate hostname, proxy <code>/docs</code>{" "}
              through the site you already run. The{" "}
              <Link className={externalLink} href="/docs/guides/proxy-vercel">
                Vercel guide
              </Link>{" "}
              has a paste-ready config, with Cloudflare, Nginx, and Caddy
              alongside it.
            </p>

            <h2
              className="h-display font-bold text-2xl md:text-3xl"
              id="on-merge"
            >
              What happens when the pull request is merged?
            </h2>
            <p>
              The merge is the publish event. With the GitHub App installed, a
              push to <code>main</code> that touches a folder with a{" "}
              <code>docs.json</code> rebuilds the site from that commit. The
              same deploy writes <code>llms.txt</code>,{" "}
              <code>llms-full.txt</code>, and a <code>.md</code> twin of every
              page. Rolling the docs back is reverting the commit.
            </p>
            <p>
              Anything that publishes on save from a second editor reintroduces
              the drift the workflow was meant to remove, which is why there is
              no second editor here. If you would rather not install the App,{" "}
              <code>blodemd push docs</code> from the terminal publishes the
              same way. The build is described in{" "}
              <Link className={externalLink} href="/docs/how-it-works">
                how it works
              </Link>
              .
            </p>

            <h2
              className="h-display font-bold text-2xl md:text-3xl"
              id="llms-txt"
            >
              Do I still need llms.txt if I have a sitemap?
            </h2>
            <p>
              They answer different questions. A sitemap lists URLs for a
              crawler, and{" "}
              <a
                className={externalLink}
                href="https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt"
                rel="noopener noreferrer"
                target="_blank"
              >
                robots.txt
              </a>{" "}
              tells that crawler what it may fetch. <code>llms.txt</code>, as
              proposed at{" "}
              <a
                className={externalLink}
                href="https://llmstxt.org/"
                rel="noopener noreferrer"
                target="_blank"
              >
                llmstxt.org
              </a>
              , is a Markdown index for a model reading at inference time,
              pointing at Markdown versions of the pages so the model does not
              parse HTML chrome.
            </p>
            <p>
              Agents read Markdown, not HTML. If that Markdown comes from a
              different pipeline than the site, it lags the site. Here it comes
              from the same commit. The longer answer, with examples, is in the{" "}
              <Link
                className={externalLink}
                href="/free-online-llms-txt-resources"
              >
                llms.txt resource
              </Link>
              .
            </p>

            <h2
              className="h-display font-bold text-2xl md:text-3xl"
              id="migrate"
            >
              How do I move an existing Docusaurus or Mintlify site over?
            </h2>
            <p>
              Files move as files. Run <code>blodemd new docs</code> to scaffold
              a <code>docs.json</code>, move your <code>.md</code> and{" "}
              <code>.mdx</code> in, and write the navigation in{" "}
              <code>docs.json</code>. Callouts, tabs, code groups, and OpenAPI
              references are built in. A component that came from a plugin is
              not, so expect to replace those by hand.
            </p>
            <p>
              From Mintlify, the <code>docs.json</code> is similar in spirit,
              but the config surface is smaller and some keys do not exist here.
              Trim the config, do not paste it; this is not a drop-in
              replacement. From Docusaurus, you delete the app. The MDX stays,
              and any custom React in the pages gets rewritten to the built-in
              set. Point <code>docs.json</code> at your OpenAPI spec and the API
              reference ships in the same deploy as the guides, so there is no
              separate API documentation tool to keep in step.
            </p>

            <h2
              className="h-display font-bold text-2xl md:text-3xl"
              id="how-to"
            >
              How to do it
            </h2>
            <ol>
              <li>Sign in with GitHub.</li>
              <li>
                Run <code>blodemd new docs</code> in the repo. It writes a{" "}
                <code>docs.json</code> and a folder.
              </li>
              <li>
                Open a pull request that changes the code and the docs together.
                Review both.
              </li>
              <li>
                Merge. The site, <code>llms.txt</code>, and the <code>.md</code>{" "}
                pages publish from that commit.
              </li>
            </ol>

            <h2
              className="h-display font-bold text-2xl md:text-3xl"
              id="trade-offs"
            >
              What you do not get
            </h2>
            <p>
              No visual editor. No plugin marketplace. No SOC 2, SSO, or SLA.
              Support is me. Hosted is $0 with unlimited projects, pages, and
              seats, and custom domains, search, MDX, and API references are
              included. The{" "}
              <Link className={externalLink} href="/pricing">
                pricing page
              </Link>{" "}
              names each edition by what it leaves out.
            </p>
            <p>
              If the question is what happens when Blode.md is gone, the CLI and
              renderer are MIT, which makes this an open source documentation
              platform in the narrow sense: the same binary on your own
              Postgres. That is the bus-factor answer, not a feature.
            </p>
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
              <SignupLink location="docs_as_code">
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
