# Brief: docs-as-code platform for MDX in git

Date: 2026-09-06 · Status: Request

## Why this page exists

Audience: a DX engineer or founder who already keeps MDX docs in the product repo and is choosing where to host them.
Gap: blode.md has a comparison page (`/compare/mintlify`) and reference docs, but no category page a person lands on when they search the category rather than a competitor. Google's AI features fan a "Mintlify alternative" query out into category queries; the site covers none of them.
Job of the page: decide.

## SEO decisions

| Field                   | Value                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary keyword         | docs-as-code platform                                                                                                                                                                                                                |
| Search volume           | No data (no keyword tool bound; Ahrefs exists only as manual CSV exports)                                                                                                                                                            |
| Exact prompt volume     | No data (no AI-visibility tool bound)                                                                                                                                                                                                |
| Secondary keywords      | git-native documentation (No data), MDX documentation hosting (No data), publish docs on merge (No data)                                                                                                                             |
| Search Console evidence | 0 impressions on any query containing docs, documentation, mdx, mintlify, docusaurus, readme, gitbook or llms across blode.md and blode.co, 90 days to 2026-09-03 (PostHog warehouse sync of both GSC properties, pulled 2026-09-06) |
| Brand search            | "blode": 938 impressions / 0 clicks on blode.md, 1650 / 2 on blode.co, 90 days (same source). Measured branded search impressions, not branded web mentions or YouTube mentions.                                                     |
| Title                   | Docs-as-code platform: MDX in git, published on merge                                                                                                                                                                                |
| H1                      | Docs as code, hosted                                                                                                                                                                                                                 |
| Meta description        | Keep docs as MDX in the repo, review them in the pull request, and let the merge publish the site plus the Markdown agents read.                                                                                                     |
| Canonical               | https://blode.md/docs-as-code                                                                                                                                                                                                        |

## North star

Tone: first person, plain, the founder explaining a choice he made. No "beautiful", no "in seconds", no "knowledge layer" (all retired in POSITIONING.md).
The reader should leave knowing: whether their team's docs workflow is a pull-request workflow, and if it is, that the hosting can be $0 and git-only.

## Ideas to land

- Docs as code is a review decision before it is a tooling decision: if docs change in the same pull request as the code, drift stops being a process problem.
- The merge is the publish event. Anything that publishes on save from a second editor reintroduces the drift the workflow was meant to remove.
- Agents read Markdown, not HTML. The llms.txt and .md twins have to come from the same commit as the site or they lag it.
- The named trade-offs: no visual editor, no marketplace, no SOC 2, founder support. Say them before the reader asks.
- Self-host is the bus-factor answer, not a feature: same CLI and renderer on your own Postgres, MIT.

## Shape

Problem → evidence → questions → how to do it → short close.

## Questions worth answering

Evaluator questions first, product-specific after.

1. What does docs as code actually mean in practice?
2. When is docs as code the wrong choice for a team?
3. How is a docs-as-code host different from a docs CMS like GitBook or Notion? (partly covered on /compare/mintlify and the home FAQ)
4. How do I keep docs on my own domain under /docs? (covered in /docs/guides/proxy-vercel, proxy-cloudflare, proxy-nginx; link, do not repeat)
5. What happens to docs when the pull request is merged?
6. Do I still need llms.txt if I have a sitemap? (covered on /free-online-llms-txt-resources)
7. How do I move an existing Docusaurus or Mintlify site into this?

## Sources the writer can cite

- https://www.writethedocs.org/guide/docs-as-code/
- https://llmstxt.org/
- https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt
- https://blode.md/docs/how-it-works
- https://blode.md/compare/mintlify

## Evidence

| Keyword                   | Search volume                               | Exact prompt volume | Source, scope, window                                                                                                   |
| ------------------------- | ------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| docs-as-code platform     | No data                                     | No data             | No keyword or AI-visibility tool bound, 2026-09-06                                                                      |
| git-native documentation  | No data                                     | No data             | same                                                                                                                    |
| MDX documentation hosting | No data                                     | No data             | same                                                                                                                    |
| mintlify alternative      | No data                                     | No data             | same; SERP checked by hand 2026-09-06: GitBook, Ferndesk, Documentation.AI, HelpKit, Hyperdocs, Mintlify's own rebuttal |
| blode (brand)             | 938 impressions (blode.md), 1650 (blode.co) | n/a                 | Google Search Console via PostHog warehouse, global, 90 days to 2026-09-03, pulled 2026-09-06                           |

Binding Ahrefs or Semrush (API key or a signed-in browser session) is the only way to fill the volume column; the numbers above are the complete set that exists today.
