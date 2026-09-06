# Blode.md vs Mintlify

Both publish MDX from git. Mintlify adds a web editor and a marketplace on top. Blode.md is the git path without either, hosted for $0 with unlimited seats, and MIT if you would rather run it yourself.

Written by the Blode.md founder. Mintlify facts were checked on their site on 2026-08-12.

## Comparison

| Feature                                  | Blode.md                                                                                       | Mintlify                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Where docs live                          | MDX in your repo. The pull request is the review.                                              | MDX in your repo, plus a web editor that commits back.    |
| Visual editor                            | None. On purpose.                                                                              | Yes, included on Starter.                                 |
| Publish                                  | Merge to main, or `blodemd push` from the terminal.                                            | Merge to main, or save in the web editor.                 |
| Free tier                                | $0 hosted. Unlimited projects, pages, and seats.                                               | Starter is $0 with a custom domain and five editor seats. |
| Custom domain, search, OpenAPI reference | Included on hosted.                                                                            | Included on Starter.                                      |
| Markdown for agents                      | llms.txt, llms-full.txt, and a .md twin of every page, written by the same deploy as the HTML. | llms.txt and Markdown export.                             |
| Plugins and integrations                 | No marketplace. Callouts, tabs, code groups, and OpenAPI are built in.                         | Integration marketplace.                                  |
| Self-host                                | MIT CLI and renderer. Same binary on your own Postgres.                                        | Hosted only.                                              |
| SOC 2, SSO, SLA                          | None. Support is the founder.                                                                  | Available on paid tiers.                                  |

## Choose Mintlify if

- Someone on the team writes docs without a repo.
- You want a marketplace of integrations.
- Procurement needs SOC 2, SSO, or an SLA on paper.
- You want a vendor with a support team, not a founder.

## Choose Blode.md if

- Docs are reviewed in the pull request, and only there.
- You want the Markdown agents read to come from the same commit as the HTML.
- Unlimited seats matter more than a second editor.
- You want an MIT escape hatch: the same CLI and renderer on your own Postgres.

## FAQ

### Is Blode.md a drop-in replacement for Mintlify?

No. The docs.json is similar in spirit, and MDX files move over as files, but the config surface is smaller and some keys do not exist here. Expect to trim the config, not paste it.

### Mintlify has a free tier too. What is actually different?

Mintlify Starter is also $0 and includes a web editor and five editor seats. The difference is what is left out: Blode.md ships no editor and no marketplace, and its CLI and renderer are MIT so you can run the same thing on your own Postgres.

### When should I pick Mintlify instead?

Choose Mintlify if anyone on the team needs to edit docs without a repo, if you want a marketplace, or if you need SOC 2, SSO, or an SLA on a contract. Those are real products and Blode.md does not offer them.

### How do I move from Mintlify to Blode.md?

Sign in with GitHub, run `blodemd new` to scaffold a docs.json, move your MDX files in, and push. Proxy guides for Vercel, Cloudflare, and Nginx cover keeping docs on your own domain under /docs.

[Connect GitHub](https://blode.md/oauth/consent) · [Pricing](https://blode.md/pricing)
