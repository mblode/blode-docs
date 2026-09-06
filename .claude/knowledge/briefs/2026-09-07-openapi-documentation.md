# Brief: OpenAPI documentation from a spec

Date: 2026-09-07 · Status: Request

## Why this page exists

Audience: a developer or DX engineer who already maintains an OpenAPI spec and wants the published API reference to come from it, in the same deploy as the guides.
Gap: the product renders API references from a spec today, but the only page that says so is a docs reference page. The homepage names OpenAPI eight times and holds no URL for it. This is the same shape as Mintlify before `/compare/mintlify` shipped: real capability, no page to rank.
Job of the page: decide.

## SEO decisions

| Field                   | Value                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary keyword         | openapi documentation                                                                                                                                                                                            |
| Search volume           | 2,400/mo worldwide (DataForSEO Google Ads, English, trailing 12-month average, pulled 2026-09-07)                                                                                                                |
| Exact prompt volume     | No data (no AI-visibility tool bound)                                                                                                                                                                            |
| Secondary keywords      | api documentation tool (1,900), api documentation generator (1,900), technical documentation software (880), swagger documentation tool (10)                                                                     |
| Search Console evidence | 0 impressions on any query containing api, openapi, doc, gitbook or docusaurus across blode.co, 28 days to 2026-09-03. blode.md has no impression on any non-brand query in its full history back to 2026-04-09. |
| Brand search            | 28 days to 2026-09-03: blode.md 527 impressions / 0 clicks, blode.co 1,595 / 5. Measured branded search impressions, not branded web mentions or YouTube mentions.                                               |
| Title                   | OpenAPI documentation: publish the API reference from your spec                                                                                                                                                  |
| H1                      | Your OpenAPI spec, published as docs                                                                                                                                                                             |
| Meta description        | Point docs.json at an OpenAPI spec and the API reference ships in the same deploy as the guides, from the same commit.                                                                                           |
| Canonical               | https://blode.md/openapi-documentation                                                                                                                                                                           |

## North star

Tone: first person, plain, the founder explaining a mechanism. No "beautiful", no "in seconds", no "knowledge layer", no "powerful". Retired phrases are listed in `.claude/knowledge/POSITIONING.md`.
The reader should leave knowing: whether pointing a config file at their spec is enough to replace whatever renders their API reference today.

## Ideas to land

- The reference and the guides come out of one deploy, so the endpoint a reader sees is the endpoint that shipped. Drift between a separate reference site and the product is the problem being solved (P1).
- A spec is already the source of truth. The docs job is rendering it, not re-describing it by hand.
- The agent-readable copy is generated from the same spec, so an assistant answering about the API is reading the merged commit rather than scraped HTML (P2, P12).
- Name the limits honestly: which spec versions are handled, what happens to a spec that fails to parse, and what this does not do (no mock server, no request playground promises the product cannot keep). Verify each against the code before writing.

## Shape

Problem → evidence → questions → how to do it → short close.

## Questions worth answering

Evaluator questions first, product-specific after.

1. How do I turn an OpenAPI spec into published documentation?
2. What is the difference between an API reference and a guide, and do I need both?
3. Where should the spec live: in the repo, or hosted somewhere else?
4. What happens when the spec changes?
5. Does Swagger UI or Redoc already do this?
6. How is this different from Mintlify's API reference? (partly covered on /compare/mintlify; link rather than repeat)
7. Can an agent read my API docs? (covered on /free-online-llms-txt-resources and /docs-as-code; link)

## Sources the writer can cite

- https://spec.openapis.org/oas/latest.html
- https://www.openapis.org/
- https://blode.md/docs/features/openapi
- https://blode.md/docs/api/overview
- https://blode.md/docs-as-code

## Evidence

All volumes: DataForSEO Google Ads search volume, English, no-location (worldwide) query, trailing 12-month average, pulled 2026-09-07. Prompt volume has no bound tool, so every cell reads No data.

| Keyword                                | Worldwide | Competition | Exact prompt volume |
| -------------------------------------- | --------- | ----------- | ------------------- |
| openapi documentation                  | 2,400     | LOW         | No data             |
| api documentation tool                 | 1,900     | LOW         | No data             |
| api documentation generator            | 1,900     | LOW         | No data             |
| gitbook alternative                    | 880       | LOW         | No data             |
| technical documentation software       | 880       | LOW         | No data             |
| docusaurus alternative                 | 590       | LOW         | No data             |
| docusaurus vs                          | 90        | LOW         | No data             |
| internal documentation tool            | 30        | LOW         | No data             |
| swagger documentation tool             | 10        | LOW         | No data             |
| readme.io alternative                  | 10        | LOW         | No data             |
| host documentation                     | 10        | LOW         | No data             |
| documentation hosting                  | 10        | LOW         | No data             |
| best documentation tool for developers | 10        | MEDIUM      | No data             |
| openapi to docs                        | No data   | -           | No data             |
| publish docs from github               | No data   | -           | No data             |

The cluster around a spec-driven reference is roughly 6,200 a month worldwide across the top three terms, which is larger than the `docs as code` term the 2026-09-06 brief targeted (1,900). "documentation hosting" and "host documentation" are effectively dead at 10 a month each: nobody searches for the category by that name, which is why this page leads with the spec and not with hosting.

| Brand    | Impressions | Clicks | Source                                                                                        |
| -------- | ----------- | ------ | --------------------------------------------------------------------------------------------- |
| blode.md | 527         | 0      | Google Search Console via PostHog warehouse, global, 28 days to 2026-09-03, pulled 2026-09-07 |
| blode.co | 1,595       | 5      | same                                                                                          |

## Next after this page

`gitbook alternative` (880) and `docusaurus alternative` (590) are the two remaining comparison pages with real volume, and `/compare/mintlify` is the template for both. Do them after this page, not before: a category page the site can win outranks a third comparison page.
