# Free online llms.txt resources

Educational resource by [Matthew Blode](https://blode.co) / Blode.md. Last updated 10 August 2026.

llms.txt is a proposed Markdown file served at `/llms.txt` that gives language models a curated, LLM-friendly index of a website. It starts with an H1 title, a short summary, and lists of linked Markdown resources so agents can load concise documentation without scraping noisy HTML. The informal standard is documented at [llmstxt.org](https://llmstxt.org/).

## Table of contents

1. [What is llms.txt](#what-is-llms-txt)
2. [Why it matters](#why-it-matters)
3. [How to add one](#how-to-add-one)
4. [Examples](#examples)
5. [Specs & standards](#specs-and-standards)
6. [Tools & generators](#tools-and-generators)
7. [Related docs on Blode.md](#related-docs-on-blode-md)
8. [FAQ](#faq)

## What is llms.txt

**Short answer:** A root (or docs-base) Markdown file that tells an LLM what your site is and which clean Markdown URLs to load next.

HTML pages mix navigation, scripts, and chrome that waste context. The [llms.txt proposal](https://llmstxt.org/) asks sites to publish a small Markdown index plus `.md` alternates of important pages. Models and tools can fetch those files on demand instead of parsing the full DOM.

The only required section is an H1 with the project or site name. A blockquote summary, free-form notes, and H2 “file lists” of links are optional but recommended.

## Why it matters

**Short answer:** Agents answering product questions need a trustworthy, size-bounded map of your docs, not every URL in the sitemap.

Coding assistants, chatbots with web tools, and internal RAG pipelines already pull documentation at inference time. A curated index reduces wrong pages, trims tokens, and makes “append `.md`” a predictable convention. It sits beside `robots.txt` and `sitemap.xml`; it does not replace them.

| File          | Primary audience | Job                               |
| ------------- | ---------------- | --------------------------------- |
| `robots.txt`  | Crawlers         | Access rules and crawl hints      |
| `sitemap.xml` | Search engines   | Exhaustive list of indexable URLs |
| `llms.txt`    | LLMs and agents  | Curated, concise Markdown index   |

## How to add one

**Short answer:** Publish Markdown at `/llms.txt`, link `.md` versions of key pages, keep the file short, and test that an LLM can answer from it.

### Implementation checklist

| Step | What to do                                                                                 |
| ---- | ------------------------------------------------------------------------------------------ |
| 1    | Serve `/llms.txt` at the site root or docs base path (same idea as robots and sitemap).    |
| 2    | Start with `# Site name` and a one-line `> summary`.                                       |
| 3    | Under H2 sections, list `[title](url.md): note` links to Markdown pages.                   |
| 4    | Put secondary material under `## Optional` so tools can skip it for short context.         |
| 5    | Fetch the file, expand a few links, and ask an LLM product questions against that context. |

If you host docs on Blode.md, you do not hand-author the index for every deploy: the platform generates tenant-aware `llms.txt`, `llms-full.txt`, and `.md` page exports from your MDX. Configure the public URL with `seo.siteUrl` when a proxy sits in front. Details in [SEO and sitemaps](https://blode.md/docs/features/seo).

## Examples

**Short answer:** A valid file is an H1, optional summary, then H2 lists of Markdown links. Here is a minimal shape you can adapt.

```md
# Acme Docs

> Acme is an API for invoicing. This index lists the pages agents should read first.

## Docs

- [Quickstart](https://docs.example.com/quickstart.md): Create an API key and send a test invoice
- [Auth](https://docs.example.com/auth.md): Bearer tokens and scopes

## Optional

- [Changelog](https://docs.example.com/changelog.md): Release notes
```

Live references worth reading: the FastHTML docs index linked from [llmstxt.org](https://llmstxt.org/), and Blode.md's own [/llms.txt](https://blode.md/llms.txt).

## Specs & standards

**Short answer:** Treat llmstxt.org as the canonical informal spec; there is no separate IETF or W3C RFC yet.

- [llmstxt.org](https://llmstxt.org/): proposal, format rules, and examples from Answer.AI / fast.ai.
- [AnswerDotAI/llms-txt](https://github.com/AnswerDotAI/llms-txt): source and discussion for the proposal.
- Coexists with `/robots.txt` and `/sitemap.xml`; path convention mirrors those files.

## Tools & generators

**Short answer:** Use a docs platform that emits the files, or a framework plugin; use `llms_txt2ctx` when you need a single context blob.

- [llms_txt2ctx](https://github.com/AnswerDotAI/llms-txt): CLI/Python helper that expands an llms.txt index into context files (as described on llmstxt.org).
- Framework generators such as vitepress-plugin-llms and docusaurus-plugin-llms are listed on [llmstxt.org](https://llmstxt.org/). Use those listings rather than package-registry pages that block crawlers.
- [Blode.md](https://blode.md/): git-native docs, published on merge. Sites ship `llms.txt` / `llms-full.txt` / `.md` alternates from the same deploy. See [pricing](https://blode.md/pricing).

## Related docs on Blode.md

**Short answer:** Platform docs cover SEO exports; the marketing site also serves an llms.txt for agents.

- [Blode.md docs](https://blode.md/docs)
- [SEO and sitemaps](https://blode.md/docs/features/seo): robots, sitemap, llms.txt, llms-full.txt, and `.md` exports
- [blode.md/llms.txt](https://blode.md/llms.txt)
- [About Blode.md](https://blode.md/about)

## FAQ

### What is llms.txt?

A Markdown file at `/llms.txt` (or under a docs base path) that gives language models a curated title, summary, and links to LLM-friendly content. It is an informal proposal documented at llmstxt.org, not a W3C standard.

### Is llms.txt required for SEO?

No. Search engines still rely on HTML, sitemaps, and robots.txt. llms.txt helps agents and tools that prefer concise Markdown indexes. Treat it as complementary to SEO, not a replacement.

### How is llms.txt different from sitemap.xml?

sitemap.xml lists indexable URLs for crawlers. llms.txt is a short, curated overview with optional notes and pointers to Markdown versions of pages. A sitemap is exhaustive; llms.txt should stay small enough to load into a prompt.

### Do I need llms-full.txt as well?

llms.txt is the index. Some sites also ship llms-full.txt (or generated context files) with expanded page content for larger windows. Start with llms.txt and `.md` page alternates; add a full dump only if your readers need it.

### Does Blode.md generate llms.txt automatically?

Yes. Blode.md sites get tenant-aware `/llms.txt`, `/llms-full.txt`, robots.txt, sitemap.xml, and per-page `.md` exports automatically. See [/docs/features/seo](https://blode.md/docs/features/seo) for the full list.

## Ship docs that already expose llms.txt

If you want the educational path above without maintaining generators yourself, Blode.md turns a folder of MDX into a docs site that includes the AI-facing exports. Write locally, push from the CLI, review in a pull request. Same loop as code.

[Connect GitHub](https://blode.md/oauth/consent) · [Read SEO docs](https://blode.md/docs/features/seo)
