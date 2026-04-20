const MARKETING_MARKDOWN: Record<string, string> = {
  "/": `# Blode.md

Docs your users love. And their AI understands.

Write MDX, commit, push. blode.md ships a fast, beautiful docs site in one git push, wired up for the LLMs your users ask too.

## How it works

1. Install the GitHub app at github.com/apps/blodemd
2. Pick a repo and a docs folder
3. Push to \`main\`, deployed to \`acme.blode.md\`

Or use the CLI:

\`\`\`
npm i -g blodemd
blodemd login
blodemd new docs
blodemd push docs
\`\`\`

## What you get

- **GitHub auto-deploy** — Install once. Every push to your branch deploys in seconds.
- **Custom domains** — Point a domain, get SSL. Or proxy docs at yourdomain.com/docs.
- **MDX components** — 30+ components out of the box: callouts, tabs, code groups, API refs.
- **Search** — Full-text search across every page. No plugin, no config.
- **Content types** — Docs, blogs, changelogs, and courses in one project, one domain.
- **API reference** — Point at an OpenAPI spec, ship an interactive API reference.

## Links

- [About](https://blode.md/about)
- [Blog](https://blode.md/blog)
- [Changelog](https://blode.md/changelog)
- [Privacy](https://blode.md/privacy)
- [Terms](https://blode.md/terms)
- [Security](https://blode.md/security)
- [Docs](https://blode.md/docs)
- [GitHub](https://github.com/mblode/blodemd)
`,
  "/about": `# About Blode.md

blode.md is a docs platform that lives in your git repo. Write MDX, push to main, ship docs.
`,
  "/blog": `# Blog

Notes from the team building blode.md.
`,
  "/changelog": `# Changelog

Latest updates to the blode.md platform.
`,
  "/privacy": `# Privacy Policy

How blode.md collects, uses, and protects your information.
`,
  "/security": `# Security

Security practices at blode.md.
`,
  "/terms": `# Terms of Service

Terms governing your use of blode.md.
`,
};

export const getMarketingMarkdown = (pathname: string): string | null => {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return MARKETING_MARKDOWN[normalized] ?? null;
};

export const hasMarketingMarkdown = (pathname: string): boolean =>
  getMarketingMarkdown(pathname) !== null;
