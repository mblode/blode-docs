import { ArrowRightIcon } from "blode-icons-react";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { SignupLink } from "@/components/ui/signup-link";
import { siteConfig } from "@/lib/config";
import { getEducationalResource } from "@/lib/educational-resources";
import { marketingUrl, pageMetadata, SITE_NAME } from "@/lib/marketing-site";
import {
  articleNode,
  breadcrumbNode,
  faqPageNode,
  pageJsonLd,
  webPageNode,
} from "@/lib/structured-data";

const resource = getEducationalResource("free-online-llms-txt-resources");

if (!resource) {
  throw new Error(
    "Missing educational resource: free-online-llms-txt-resources"
  );
}

const { description, path, publishedAt, title, updatedAt } = resource;

export const metadata = pageMetadata({
  description,
  path,
  title,
  type: "article",
});

const toc = [
  { href: "#what-is-llms-txt", label: "What is llms.txt" },
  { href: "#why-it-matters", label: "Why it matters" },
  { href: "#how-to-add-one", label: "How to add one" },
  { href: "#examples", label: "Examples" },
  { href: "#specs-and-standards", label: "Specs & standards" },
  { href: "#tools-and-generators", label: "Tools & generators" },
  { href: "#related-docs-on-blode-md", label: "Related docs on Blode.md" },
  { href: "#faq", label: "FAQ" },
] as const;

const faqs = [
  {
    answer:
      "A Markdown file at /llms.txt (or under a docs base path) that gives language models a curated title, summary, and links to LLM-friendly content. It is an informal proposal documented at llmstxt.org, not a W3C standard.",
    question: "What is llms.txt?",
  },
  {
    answer:
      "No. Search engines still rely on HTML, sitemaps, and robots.txt. llms.txt helps agents and tools that prefer concise Markdown indexes. Treat it as complementary to SEO, not a replacement.",
    question: "Is llms.txt required for SEO?",
  },
  {
    answer:
      "sitemap.xml lists indexable URLs for crawlers. llms.txt is a short, curated overview with optional notes and pointers to Markdown versions of pages. A sitemap is exhaustive; llms.txt should stay small enough to load into a prompt.",
    question: "How is llms.txt different from sitemap.xml?",
  },
  {
    answer:
      "llms.txt is the index. Some sites also ship llms-full.txt (or generated context files) with expanded page content for larger windows. Start with llms.txt and .md page alternates; add a full dump only if your readers need it.",
    question: "Do I need llms-full.txt as well?",
  },
  {
    answer:
      "Yes. Blode.md sites get tenant-aware /llms.txt, /llms-full.txt, robots.txt, sitemap.xml, and per-page .md exports automatically. See /docs/features/seo for the full list.",
    question: "Does Blode.md generate llms.txt automatically?",
  },
] as const;

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });

const jsonLd = pageJsonLd(
  webPageNode({
    description,
    extra: { mainEntity: { "@id": `${marketingUrl(path)}#article` } },
    name: title,
    path,
  }),
  articleNode({
    dateModified: updatedAt,
    datePublished: publishedAt,
    description,
    headline: title,
    path,
  }),
  faqPageNode(path, faqs),
  breadcrumbNode([
    { name: "Home", path: "/" },
    { name: title, path },
  ])
);

const exampleLlmsTxt = `# Acme Docs
> Acme is an API for invoicing. This index lists the pages agents should read first.

## Docs
- [Quickstart](https://docs.example.com/quickstart.md): Create an API key and send a test invoice
- [Auth](https://docs.example.com/auth.md): Bearer tokens and scopes

## Optional
- [Changelog](https://docs.example.com/changelog.md): Release notes`;

export default function FreeOnlineLlmsTxtResourcesPage() {
  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <article>
        <section className="pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="container">
            <Badge className="mb-4" variant="outline">
              Educational resource
            </Badge>
            <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
              {title}
            </h1>
            <p className="measure mt-6 text-balance text-lg text-muted-foreground md:text-xl">
              llms.txt is a proposed Markdown file served at{" "}
              <code>/llms.txt</code> that gives language models a curated,
              LLM-friendly index of a website. It starts with an H1 title, a
              short summary, and lists of linked Markdown resources so agents
              can load concise documentation without scraping noisy HTML. The
              informal standard is documented at{" "}
              <a
                className="underline underline-offset-4"
                href="https://llmstxt.org/"
                rel="noopener noreferrer"
                target="_blank"
              >
                llmstxt.org
              </a>
              .
            </p>
            <p className="mt-6 text-muted-foreground text-sm">
              By{" "}
              <a
                className="underline underline-offset-4"
                href={siteConfig.links.author}
                rel="noopener noreferrer"
                target="_blank"
              >
                Matthew Blode
              </a>{" "}
              / {SITE_NAME}
              <span aria-hidden="true"> · </span>
              Last updated{" "}
              <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
            </p>
          </div>
        </section>

        <section className="border-border border-t py-12 md:py-16">
          <div className="container">
            <nav aria-labelledby="toc-heading" className="measure">
              <h2
                className="h-display font-bold text-xl md:text-2xl"
                id="toc-heading"
              >
                Table of contents
              </h2>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-muted-foreground">
                {toc.map((item) => (
                  <li key={item.href}>
                    <a
                      className="underline underline-offset-4"
                      href={item.href}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </section>

        <section className="pb-24 md:pb-32">
          <div className="container">
            <div className="typeset measure text-muted-foreground">
              <h2
                className="h-display font-bold text-2xl md:text-3xl"
                id="what-is-llms-txt"
              >
                What is llms.txt
              </h2>
              <p>
                <strong>Short answer:</strong> A root (or docs-base) Markdown
                file that tells an LLM what your site is and which clean
                Markdown URLs to load next.
              </p>
              <p>
                HTML pages mix navigation, scripts, and chrome that waste
                context. The{" "}
                <a
                  className="underline underline-offset-4"
                  href="https://llmstxt.org/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  llms.txt proposal
                </a>{" "}
                asks sites to publish a small Markdown index plus{" "}
                <code>.md</code> alternates of important pages. Models and tools
                can fetch those files on demand instead of parsing the full DOM.
              </p>
              <p>
                The only required section is an H1 with the project or site
                name. A blockquote summary, free-form notes, and H2 “file lists”
                of links are optional but recommended.
              </p>

              <h2
                className="h-display font-bold text-2xl md:text-3xl"
                id="why-it-matters"
              >
                Why it matters
              </h2>
              <p>
                <strong>Short answer:</strong> Agents answering product
                questions need a trustworthy, size-bounded map of your docs, not
                every URL in the sitemap.
              </p>
              <p>
                Coding assistants, chatbots with web tools, and internal RAG
                pipelines already pull documentation at inference time. A
                curated index reduces wrong pages, trims tokens, and makes
                “append <code>.md</code>” a predictable convention. It sits
                beside <code>robots.txt</code> and <code>sitemap.xml</code>; it
                does not replace them.
              </p>

              <div className="typeset-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">File</th>
                      <th scope="col">Primary audience</th>
                      <th scope="col">Job</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <code>robots.txt</code>
                      </td>
                      <td>Crawlers</td>
                      <td>Access rules and crawl hints</td>
                    </tr>
                    <tr>
                      <td>
                        <code>sitemap.xml</code>
                      </td>
                      <td>Search engines</td>
                      <td>Exhaustive list of indexable URLs</td>
                    </tr>
                    <tr>
                      <td>
                        <code>llms.txt</code>
                      </td>
                      <td>LLMs and agents</td>
                      <td>Curated, concise Markdown index</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2
                className="h-display font-bold text-2xl md:text-3xl"
                id="how-to-add-one"
              >
                How to add one
              </h2>
              <p>
                <strong>Short answer:</strong> Publish Markdown at{" "}
                <code>/llms.txt</code>, link <code>.md</code> versions of key
                pages, keep the file short, and test that an LLM can answer from
                it.
              </p>

              <h3
                className="h-display font-bold text-xl md:text-2xl"
                id="implementation-checklist"
              >
                Implementation checklist
              </h3>
              <div className="typeset-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Step</th>
                      <th scope="col">What to do</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>
                        Serve <code>/llms.txt</code> at the site root or docs
                        base path (same idea as robots and sitemap).
                      </td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>
                        Start with <code># Site name</code> and a one-line{" "}
                        <code>&gt; summary</code>.
                      </td>
                    </tr>
                    <tr>
                      <td>3</td>
                      <td>
                        Under H2 sections, list{" "}
                        <code>[title](url.md): note</code> links to Markdown
                        pages.
                      </td>
                    </tr>
                    <tr>
                      <td>4</td>
                      <td>
                        Put secondary material under <code>## Optional</code> so
                        tools can skip it for short context.
                      </td>
                    </tr>
                    <tr>
                      <td>5</td>
                      <td>
                        Fetch the file, expand a few links, and ask an LLM
                        product questions against that context.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                If you host docs on Blode.md, you do not hand-author the index
                for every deploy: the platform generates tenant-aware{" "}
                <code>llms.txt</code>, <code>llms-full.txt</code>, and{" "}
                <code>.md</code> page exports from your MDX. Configure the
                public URL with <code>seo.siteUrl</code> when a proxy sits in
                front: details in{" "}
                <Link
                  className="underline underline-offset-4"
                  href="/docs/features/seo"
                >
                  SEO and sitemaps
                </Link>
                .
              </p>

              <h2
                className="h-display font-bold text-2xl md:text-3xl"
                id="examples"
              >
                Examples
              </h2>
              <p>
                <strong>Short answer:</strong> A valid file is an H1, optional
                summary, then H2 lists of Markdown links. Here is a minimal
                shape you can adapt.
              </p>
              <pre>
                <code>{exampleLlmsTxt}</code>
              </pre>
              <p>
                Live references worth reading: the FastHTML docs index linked
                from{" "}
                <a
                  className="underline underline-offset-4"
                  href="https://llmstxt.org/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  llmstxt.org
                </a>
                , and Blode.md&apos;s own{" "}
                <Link className="underline underline-offset-4" href="/llms.txt">
                  /llms.txt
                </Link>
                .
              </p>

              <h2
                className="h-display font-bold text-2xl md:text-3xl"
                id="specs-and-standards"
              >
                Specs &amp; standards
              </h2>
              <p>
                <strong>Short answer:</strong> Treat llmstxt.org as the
                canonical informal spec; there is no separate IETF or W3C RFC
                yet.
              </p>
              <ul>
                <li>
                  <a
                    className="underline underline-offset-4"
                    href="https://llmstxt.org/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    llmstxt.org
                  </a>
                  : proposal, format rules, and examples from Answer.AI /
                  fast.ai.
                </li>
                <li>
                  <a
                    className="underline underline-offset-4"
                    href="https://github.com/AnswerDotAI/llms-txt"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    AnswerDotAI/llms-txt
                  </a>
                  : source and discussion for the proposal.
                </li>
                <li>
                  Coexists with <code>/robots.txt</code> and{" "}
                  <code>/sitemap.xml</code>; path convention mirrors those
                  files.
                </li>
              </ul>

              <h2
                className="h-display font-bold text-2xl md:text-3xl"
                id="tools-and-generators"
              >
                Tools &amp; generators
              </h2>
              <p>
                <strong>Short answer:</strong> Use a docs platform that emits
                the files, or a framework plugin; use <code>llms_txt2ctx</code>{" "}
                when you need a single context blob.
              </p>
              <ul>
                <li>
                  <a
                    className="underline underline-offset-4"
                    href="https://github.com/AnswerDotAI/llms-txt"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    llms_txt2ctx
                  </a>
                  : CLI/Python helper that expands an llms.txt index into
                  context files (as described on llmstxt.org).
                </li>
                <li>
                  Framework generators such as vitepress-plugin-llms and
                  docusaurus-plugin-llms are listed on{" "}
                  <a
                    className="underline underline-offset-4"
                    href="https://llmstxt.org/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    llmstxt.org
                  </a>
                  . Use those listings rather than package-registry pages that
                  block crawlers.
                </li>
                <li>
                  <Link className="underline underline-offset-4" href="/">
                    Blode.md
                  </Link>
                  : git-native docs, published on merge. Sites ship{" "}
                  <code>llms.txt</code> / <code>llms-full.txt</code> /{" "}
                  <code>.md</code> alternates. See{" "}
                  <Link
                    className="underline underline-offset-4"
                    href="/pricing"
                  >
                    pricing
                  </Link>
                  .
                </li>
              </ul>

              <h2
                className="h-display font-bold text-2xl md:text-3xl"
                id="related-docs-on-blode-md"
              >
                Related docs on Blode.md
              </h2>
              <p>
                <strong>Short answer:</strong> Platform docs cover SEO exports;
                the marketing site also serves an llms.txt for agents.
              </p>
              <ul>
                <li>
                  <Link className="underline underline-offset-4" href="/docs">
                    Blode.md docs
                  </Link>
                </li>
                <li>
                  <Link
                    className="underline underline-offset-4"
                    href="/docs/features/seo"
                  >
                    SEO and sitemaps
                  </Link>
                  : robots, sitemap, llms.txt, llms-full.txt, and{" "}
                  <code>.md</code> exports
                </li>
                <li>
                  <Link
                    className="underline underline-offset-4"
                    href="/llms.txt"
                  >
                    blode.md/llms.txt
                  </Link>
                </li>
                <li>
                  <Link className="underline underline-offset-4" href="/about">
                    About Blode.md
                  </Link>
                </li>
              </ul>

              <h2 className="h-display font-bold text-2xl md:text-3xl" id="faq">
                FAQ
              </h2>
              {faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="h-display font-bold text-xl md:text-2xl">
                    {faq.question}
                  </h3>
                  <p>{faq.answer}</p>
                </div>
              ))}

              <h2 className="h-display font-bold text-2xl md:text-3xl">
                Ship docs that already expose llms.txt
              </h2>
              <p>
                If you want the educational path above without maintaining
                generators yourself, Blode.md turns a folder of MDX into a docs
                site that includes the AI-facing exports. Write locally, push
                from the CLI, review in a pull request. Same loop as code.
              </p>
              <div className="not-typeset mt-6 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <SignupLink location="edu_llms_txt_resources">
                    Connect GitHub
                    <ArrowRightIcon data-icon="inline-end" />
                  </SignupLink>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/docs/features/seo">
                    Read SEO docs
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </article>
    </MarketingShell>
  );
}
