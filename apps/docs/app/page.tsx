import { Button } from "@/components/ui/button";

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
      <header className="container flex items-center justify-between px-4 py-6">
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

      <main id="main">
        {/* Hero */}
        <section className="pb-24 pt-20 md:pb-32 md:pt-28 lg:pt-36">
          <div className="container">
            <h1 className="max-w-3xl text-balance text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl">
              Documentation that ships with your code.
            </h1>
            <p className="mt-6 max-w-lg text-balance text-lg text-muted-foreground md:text-xl">
              Write docs in your editor, version them in git, and deploy from
              the command line. No separate system, no manual steps.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button size="lg" asChild>
                <a href="#get-started">Get started</a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="https://docs.blode.md">Read the docs</a>
              </Button>
            </div>
          </div>
        </section>

        {/* CLI */}
        <section className="border-t border-border py-24 md:py-32">
          <div className="container">
            <div className="grid gap-12 md:grid-cols-2 md:items-start">
              <div>
                <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
                  Three commands to deploy.
                </h2>
                <p className="mt-4 max-w-sm text-muted-foreground">
                  No dashboard. No CMS. Login, create, push. The same workflow
                  you use for code works for docs.
                </p>
              </div>
              <div className="rounded-xl bg-surface p-6 font-mono text-sm shadow-xs md:p-8">
                <div className="space-y-6">
                  <div>
                    <p className="text-muted-foreground"># authenticate once</p>
                    <p>
                      <span className="text-muted-foreground">$</span> blodemd
                      login
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      # scaffold from your project root
                    </p>
                    <p>
                      <span className="text-muted-foreground">$</span> blodemd
                      new docs
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground"># ship it</p>
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

        {/* Features */}
        <section className="border-t border-border py-24 md:py-32">
          <div className="container">
            <div className="grid gap-16 md:grid-cols-2">
              <div>
                <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
                  Everything in one project.
                </h2>
                <p className="mt-4 max-w-sm text-muted-foreground">
                  Write once, in MDX. blode.md handles the rest.
                </p>
              </div>
              <ul className="space-y-6 text-base">
                <li>
                  <strong>MDX components.</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    Callouts, tabs, code groups, API references, and 30+ built-in
                    components.
                  </span>
                </li>
                <li>
                  <strong>Custom domains.</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    Automatic DNS verification and SSL provisioning.
                  </span>
                </li>
                <li>
                  <strong>Search.</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    Full-text search across all your content, included by default.
                  </span>
                </li>
                <li>
                  <strong>Content types.</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    Docs, blogs, changelogs, and courses from one project.
                  </span>
                </li>
                <li>
                  <strong>API reference.</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    Interactive docs generated from your OpenAPI spec.
                  </span>
                </li>
                <li>
                  <strong>Versioning.</strong>
                  <span className="text-muted-foreground">
                    {" "}
                    Pin docs to releases so readers can pick their version.
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
                <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
                  Deploy docs on every merge.
                </h2>
                <p className="mt-4 max-w-sm text-muted-foreground">
                  Add one step to your GitHub Actions workflow and docs deploy
                  alongside your code.
                </p>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-surface p-6 font-mono text-sm shadow-xs md:p-8">
                {
                  "- name: Deploy docs\n  run: npx blodemd push docs\n  env:\n    BLODEMD_API_KEY: $"
                }
                {"{{ secrets.BLODEMD_API_KEY }}"}
              </pre>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border py-24 md:py-32">
          <div className="container" id="get-started">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Get started in a minute.
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
                href="https://docs.blode.md"
              >
                docs.blode.md
              </a>
              <a
                className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                href="https://example.blode.md"
              >
                example.blode.md
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex items-center justify-between px-4 text-sm text-muted-foreground">
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
