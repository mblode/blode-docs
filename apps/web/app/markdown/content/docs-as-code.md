# Docs as code, hosted

Docs as code, sometimes written documentation as code, means the documentation is Markdown or MDX files in the product repository. A doc change is a commit, the review is the pull request, and the merge is the publish. There is no second editor and no separate publish step to forget.

Blode.md hosts that workflow and nothing else. I am the founder, and this page is how I would decide whether it fits your team.

## Why the workflow matters more than the host

The [Write the Docs guide](https://www.writethedocs.org/guide/docs-as-code/) defines docs as code as using the tools engineers already use: version control, plain text, code review, automated builds. All of that tooling follows from one decision. Docs change in the same pull request as the code.

Once that holds, drift stops being a process problem. A reviewer who sees a new flag with no doc change can ask for it before the merge, not after a customer finds it. If the decision does not hold, no host fixes it. Pick the workflow first, then the host.

## When is docs as code the wrong choice for my team?

When someone who writes docs does not work in git and is not going to. A support lead, a marketer, a technical writer who reviews in a browser. When an approval has to happen outside GitHub. When the people who own the docs are not the people who own the code.

A docs CMS such as GitBook or Notion is the right tool for that team, and choosing it is not a failure. If that is your team, stop here.

## How is a docs-as-code host different from GitBook or Notion?

A docs CMS is the editor and the store. Writing happens in the browser, history lives in the CMS, and git is at most a sync. A docs-as-code host is a renderer for MDX documentation. It takes the files at one commit and serves them. The editor is yours, the history is git, and the host holds nothing you could not rebuild from the repo.

That is the whole difference, and it is why the hosting can be $0: it is a build step with a URL. Mintlify sits between the two, the git path plus a web editor that commits back. That comparison has [its own page](https://blode.md/compare/mintlify).

## Can I keep docs on my own domain under /docs?

Yes. Custom domains are included on hosted. If brand or SEO will not let docs live on a separate hostname, proxy `/docs` through the site you already run. The [Vercel guide](https://blode.md/docs/guides/proxy-vercel) has a paste-ready config, with Cloudflare, Nginx, and Caddy alongside it.

## What happens when the pull request is merged?

The merge is the publish event. With the GitHub App installed, a push to `main` that touches a folder with a `docs.json` rebuilds the site from that commit. The same deploy writes `llms.txt`, `llms-full.txt`, and a `.md` twin of every page. Rolling the docs back is reverting the commit.

Anything that publishes on save from a second editor reintroduces the drift the workflow was meant to remove, which is why there is no second editor here. If you would rather not install the App, `blodemd push docs` from the terminal publishes the same way. The build is described in [how it works](https://blode.md/docs/how-it-works).

## Do I still need llms.txt if I have a sitemap?

They answer different questions. A sitemap lists URLs for a crawler, and [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt) tells that crawler what it may fetch. `llms.txt`, as proposed at [llmstxt.org](https://llmstxt.org/), is a Markdown index for a model reading at inference time, pointing at Markdown versions of the pages so the model does not parse HTML chrome.

Agents read Markdown, not HTML. If that Markdown comes from a different pipeline than the site, it lags the site. Here it comes from the same commit. The longer answer, with examples, is in the [llms.txt resource](https://blode.md/free-online-llms-txt-resources).

## How do I move an existing Docusaurus or Mintlify site over?

Files move as files. Run `blodemd new docs` to scaffold a `docs.json`, move your `.md` and `.mdx` in, and write the navigation in `docs.json`. Callouts, tabs, code groups, and OpenAPI references are built in. A component that came from a plugin is not, so expect to replace those by hand.

From Mintlify, the `docs.json` is similar in spirit, but the config surface is smaller and some keys do not exist here. Trim the config, do not paste it; this is not a drop-in replacement. From Docusaurus, you delete the app. The MDX stays, and any custom React in the pages gets rewritten to the built-in set. Point `docs.json` at your OpenAPI spec and the API reference ships in the same deploy as the guides, so there is no separate API documentation tool to keep in step.

## How to do it

1. Sign in with GitHub.
2. Run `blodemd new docs` in the repo. It writes a `docs.json` and a folder.
3. Open a pull request that changes the code and the docs together. Review both.
4. Merge. The site, `llms.txt`, and the `.md` pages publish from that commit.

## What you do not get

No visual editor. No plugin marketplace. No SOC 2, SSO, or SLA. Support is me. Hosted is $0 with unlimited projects, pages, and seats, and custom domains, search, MDX, and API references are included. The [pricing page](https://blode.md/pricing) names each edition by what it leaves out.

If the question is what happens when Blode.md is gone, the CLI and renderer are MIT, which makes this an open source documentation platform in the narrow sense: the same binary on your own Postgres. That is the bus-factor answer, not a feature.

## FAQ

### Is hosted Blode.md really $0?

Yes. Unlimited projects, pages, and seats, with custom domains, search, MDX, and OpenAPI references included. What pays for it is what is left out: no web editor, no marketplace, no SOC 2, and support is the founder.

### What if Blode.md shuts down?

The CLI and renderer are MIT, so you can run the same thing on your own Postgres. Your docs are files in your repo either way, so nothing is locked in the host.

### Does the Markdown agents read come from the same commit as the site?

Yes. The deploy that renders the HTML also writes llms.txt, llms-full.txt, and a .md twin of every page. They cannot lag the site because they are the same build.

### Can I publish without merging to main?

Yes. `blodemd push docs` publishes from the terminal, which suits a preview or a repo without the GitHub App. The merge path is the one I recommend, because it ties every publish to a reviewed commit.

[Connect GitHub](https://blode.md/oauth/consent) · [Pricing](https://blode.md/pricing)
