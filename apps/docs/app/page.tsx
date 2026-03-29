import { Button } from "@/components/ui/button";

/*
 * Visual thesis: Monochrome terminal confidence — quiet authority of a
 * well-crafted CLI manual, generous whitespace, editorial type scale.
 *
 * Content plan:
 *   1. Hero — brand-first, full-bleed, install CTA
 *   2. Support — 3-step workflow as a single terminal sequence
 *   3. Detail — features as a text list, CI/CD snippet
 *   4. Final CTA — install + live examples
 *
 * Interaction thesis:
 *   1. Fade-up entrance on hero content (CSS @keyframes)
 *   2. Cursor blink on terminal prompt
 *   3. Hover lift on links
 */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="container flex items-center justify-between py-6">
        <span className="text-base font-semibold tracking-tight">blode.md</span>
        <nav aria-label="Main">
          <a
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            href="https://github.com/mblode/blodemd"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </header>

      {/* Hero — full-bleed, brand dominant */}
      <main id="main">
        <section className="pb-24 pt-20 md:pb-32 md:pt-28 lg:pt-36">
          <div className="container">
            <h1
              className="text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl"
              style={{ textWrap: "balance" }}
            >
              blode.md
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground md:text-xl">
              Ship beautiful docs from your terminal.
              <br />
              Write MDX, deploy with one command.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <code className="rounded-lg bg-surface px-4 py-2.5 font-mono text-sm">
                <span className="text-muted-foreground">$</span> npm install -g
                blodemd
              </code>
              <Button variant="outline" size="lg" asChild>
                <a href="https://atlas.blode.md">See live docs</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Workflow — single terminal sequence, no cards */}
        <section className="border-t border-border py-24 md:py-32">
          <div className="container">
            <h2
              className="text-3xl font-bold tracking-tight md:text-4xl"
              style={{ textWrap: "balance" }}
            >
              Three commands to production
            </h2>
            <div className="mt-12 max-w-xl">
              <div className="rounded-xl bg-surface p-6 font-mono text-sm shadow-sm md:p-8">
                <div className="space-y-6">
                  <div>
                    <p className="text-muted-foreground">
                      # Authenticate via browser
                    </p>
                    <p>
                      <span className="text-muted-foreground">$</span> blodemd
                      login
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      # Scaffold a docs folder
                    </p>
                    <p>
                      <span className="text-muted-foreground">$</span> blodemd
                      init docs
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      # Deploy to slug.blode.md
                    </p>
                    <p>
                      <span className="text-muted-foreground">$</span> blodemd
                      push docs
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    Deployed to acme.blode.md
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features — text list, no cards */}
        <section className="border-t border-border py-24 md:py-32">
          <div className="container">
            <div className="grid gap-16 md:grid-cols-2">
              <div>
                <h2
                  className="text-3xl font-bold tracking-tight md:text-4xl"
                  style={{ textWrap: "balance" }}
                >
                  Built for developers
                </h2>
                <p className="mt-4 max-w-sm text-muted-foreground">
                  Everything you need to publish and maintain documentation at
                  scale.
                </p>
              </div>
              <ul className="space-y-6 text-base">
                <li>
                  <strong>MDX components</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    &mdash; Callouts, tabs, code groups, API references, and 30+
                    components.
                  </span>
                </li>
                <li>
                  <strong>Custom domains</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    &mdash; Automatic DNS verification and SSL provisioning.
                  </span>
                </li>
                <li>
                  <strong>CI/CD</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    &mdash; Deploy on every push with GitHub Actions.
                  </span>
                </li>
                <li>
                  <strong>Content types</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    &mdash; Docs, blogs, changelogs, courses, and more from one
                    project.
                  </span>
                </li>
                <li>
                  <strong>API reference</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    &mdash; Interactive docs generated from your OpenAPI spec.
                  </span>
                </li>
                <li>
                  <strong>Search</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    &mdash; Full-text search and syntax highlighting included.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CI/CD */}
        <section className="border-t border-border py-24 md:py-32">
          <div className="container">
            <div className="grid gap-12 md:grid-cols-2 md:items-start">
              <div>
                <h2
                  className="text-3xl font-bold tracking-tight md:text-4xl"
                  style={{ textWrap: "balance" }}
                >
                  Deploy from CI
                </h2>
                <p className="mt-4 max-w-sm text-muted-foreground">
                  Add one step to your GitHub Actions workflow. Every merge
                  ships.
                </p>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-surface p-6 font-mono text-sm shadow-sm md:p-8">
                {
                  "- name: Deploy docs\n  run: npx blodemd push docs\n  env:\n    BLODEMD_API_KEY: $"
                }
                {"{{ secrets.BLODEMD_API_KEY }}"}
              </pre>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border py-24 md:py-32">
          <div className="container">
            <h2
              className="text-3xl font-bold tracking-tight md:text-4xl"
              style={{ textWrap: "balance" }}
            >
              Get started
            </h2>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <code className="rounded-lg bg-surface px-4 py-2.5 font-mono text-sm">
                <span className="text-muted-foreground">$</span> npm install -g
                blodemd
              </code>
            </div>
            <div className="mt-12 flex flex-wrap gap-6">
              <a
                className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                href="https://atlas.blode.md"
              >
                atlas.blode.md
              </a>
              <a
                className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                href="https://orbit.blode.md"
              >
                orbit.blode.md
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <span>blode.md</span>
          <a
            className="transition-colors hover:text-foreground"
            href="https://github.com/mblode/blodemd"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
