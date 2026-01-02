"use client";

import Link from "next/link";
import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStartForm } from "./hooks/use-start-form";

export const LandingPage = () => {
  const { form, onSubmit } = useStartForm();
  const emailId = useId();

  return (
    <div className="min-h-screen bg-[radial-gradient(80%_80%_at_10%_10%,oklch(0.97_0.08_160_/_0.7),transparent),radial-gradient(70%_70%_at_80%_5%,oklch(0.91_0.06_250_/_0.6),transparent)]">
      <header className="relative overflow-hidden">
        <div className="mx-auto w-[min(1200px,92%)] py-10">
          <nav className="flex flex-wrap items-center justify-between gap-6">
            <div className="font-semibold text-lg uppercase tracking-[0.3em]">
              neue
            </div>
            <div className="flex flex-wrap items-center gap-6 text-muted-foreground text-sm">
              <Link href="/">Product</Link>
              <Link href="https://neue.com">Docs</Link>
              <Link href="/">Pricing</Link>
              <Link href="/">Changelog</Link>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild className="rounded-full" variant="outline">
                <Link href="https://dashboard.neue.com/signin">Sign in</Link>
              </Button>
              <Button asChild className="rounded-full">
                <Link href="https://dashboard.neue.com/signup">Start now</Link>
              </Button>
            </div>
          </nav>

          <div className="mt-14 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Badge className="rounded-full" variant="accent">
                Docs for teams that ship weekly
              </Badge>
              <h1 className="mt-6 font-semibold text-4xl leading-[1.05] tracking-tight md:text-5xl">
                Launch a docs platform that feels handcrafted.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                neue pairs a multi-tenant runtime with a focused dashboard so
                your team can ship documentation, previews, and custom domains
                in a single flow.
              </p>

              <form
                className="mt-8 flex flex-col gap-3 sm:flex-row"
                onSubmit={onSubmit}
              >
                <label className="flex-1" htmlFor={emailId}>
                  <span className="sr-only">Work email</span>
                  <Input
                    className="h-12 rounded-full bg-white/80"
                    id={emailId}
                    placeholder="Work email"
                    type="email"
                    {...form.register("email")}
                  />
                </label>
                <Button
                  className="rounded-full"
                  disabled={form.formState.isSubmitting}
                  size="lg"
                  type="submit"
                >
                  Start now
                </Button>
              </form>
              {form.formState.errors.email?.message && (
                <p className="mt-2 text-destructive text-sm">
                  {form.formState.errors.email?.message}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                <span>Free to get started</span>
                <span>OTP sign-in, no magic links</span>
              </div>
            </div>

            <Card className="relative overflow-hidden border-border/60 bg-card/80 backdrop-blur">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    Good morning, Matthew
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Welcome back to your docs dashboard.
                  </p>
                </div>
                <Button size="sm" variant="secondary">
                  Ask agent
                </Button>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Live", value: "dnd-grid.com/docs" },
                    { label: "Last updated", value: "1 day ago" },
                    { label: "Branch", value: "main" },
                  ].map((item) => (
                    <div
                      className="rounded-lg border border-border/60 bg-background/60 p-3"
                      key={item.label}
                    >
                      <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                        {item.label}
                      </p>
                      <p className="mt-2 font-semibold text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Ultracite and husky</span>
                    <Badge className="rounded-full" variant="accent">
                      Successful
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-muted-foreground text-xs">
                    <span>19 files edited</span>
                    <span>Dec 31 · 7:24 AM</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </header>

      <section className="mx-auto w-[min(1200px,92%)] py-20">
        <div className="max-w-2xl">
          <h2 className="font-semibold text-3xl">
            Every doc, every domain, every deploy.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Replace scattered scripts with one platform. Give your team a single
            place to ship docs, monitor builds, and keep domains healthy.
          </p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Multi-tenant runtime",
              body: "Serve every customer from subdomains, custom domains, or paths with edge routing.",
            },
            {
              title: "Instant previews",
              body: "Preview every branch with tenant-aware URLs and status checks.",
            },
            {
              title: "Git-first workflow",
              body: "Sync to GitHub and deploy on every push without manual builds.",
            },
            {
              title: "OTP authentication",
              body: "Secure access with one-time codes and optional Google SSO.",
            },
          ].map((feature) => (
            <Card className="border-border/60 bg-card/70" key={feature.title}>
              <CardContent className="space-y-3 p-6">
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-[min(1200px,92%)] py-16">
        <div className="grid gap-10 rounded-[32px] border border-border/60 bg-card/70 p-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <h2 className="font-semibold text-3xl">
              Bring the experience of your product to your docs.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Set colors, typography, navigation, and metadata from a single
              docs.json file. neue validates everything before it ships.
            </p>
            <ul className="mt-6 grid gap-3 text-muted-foreground text-sm">
              <li>Validated docs.json with live linting</li>
              <li>Workspace-level billing and permissions</li>
              <li>Private previews for every workspace</li>
            </ul>
          </div>
          <Card className="border-border/60 bg-background/80">
            <CardHeader className="pb-2">
              <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                docs.json
              </p>
            </CardHeader>
            <CardContent>
              <pre className="rounded-xl bg-muted/40 p-4 text-foreground text-xs">
                <code>{`{
  "name": "dnd-grid",
  "theme": "almond",
  "navigation": {
    "groups": [
      {
        "group": "Start",
        "pages": ["introduction", "installation"]
      }
    ]
  }
}`}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-[min(1200px,92%)] py-20">
        <div className="max-w-xl">
          <h2 className="font-semibold text-3xl">
            From repo to docs in three moves.
          </h2>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Connect your repo",
              body: "Install the GitHub app and select the docs path.",
            },
            {
              step: "02",
              title: "Ship a preview",
              body: "Every commit gets a preview URL with activity logs.",
            },
            {
              step: "03",
              title: "Launch on neue.com",
              body: "Assign a universal project slug or bind a custom domain.",
            },
          ].map((item) => (
            <Card className="border-border/60 bg-card/70" key={item.step}>
              <CardContent className="space-y-3 p-6">
                <span className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
                  {item.step}
                </span>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-[min(1200px,92%)] pb-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] border border-border/60 bg-foreground p-10 text-background md:flex-row md:items-center">
          <div>
            <h2 className="font-semibold text-3xl">
              Ready to run docs like a product?
            </h2>
            <p className="mt-2 text-background/70">
              Start a workspace and invite your team in minutes.
            </p>
          </div>
          <Button
            asChild
            className="rounded-full bg-background text-foreground"
            size="lg"
          >
            <Link href="https://dashboard.neue.com/signup">Start now</Link>
          </Button>
        </div>
      </section>

      <footer className="mx-auto w-[min(1200px,92%)] pb-16">
        <div className="flex flex-col items-start justify-between gap-6 border-border/60 border-t pt-8 md:flex-row">
          <div className="space-y-2">
            <strong className="text-sm uppercase tracking-[0.3em]">neue</strong>
            <p className="text-muted-foreground text-sm">
              Docs infrastructure, beautifully shipped.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-muted-foreground text-sm">
            <Link href="https://neue.com">Documentation</Link>
            <Link href="/">Status</Link>
            <Link href="/">Security</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
