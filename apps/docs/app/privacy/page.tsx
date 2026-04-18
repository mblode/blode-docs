import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { MarketingShell } from "@/components/ui/marketing-shell";

export const metadata: Metadata = {
  description:
    "Privacy policy for blode.md — what we collect, why, how long we keep it, and the rights you have over your data.",
  title: "Privacy — Blode.md",
};

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4 font-mono" variant="outline">
            Privacy
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Privacy policy
          </h1>
          <p className="mt-6 text-muted-foreground">
            Last updated: April 1, 2026.
          </p>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container">
          <div className="measure flex flex-col gap-8 text-muted-foreground leading-relaxed">
            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Who we are
              </h2>
              <p>
                Blode.md (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a managed
                docs platform for developers. This policy describes what we
                collect when you visit blode.md or use the service, and what we
                do with it.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                What we collect
              </h2>
              <ul className="flex flex-col gap-2 pl-6 [&_li]:list-disc">
                <li>
                  <span className="text-foreground">Account data</span> — your
                  GitHub profile (name, email, avatar) when you sign in.
                </li>
                <li>
                  <span className="text-foreground">Project data</span> — the
                  repos, folders, and domains you connect.
                </li>
                <li>
                  <span className="text-foreground">Usage data</span> — pages,
                  referrers, and build status, aggregated and anonymized.
                </li>
                <li>
                  <span className="text-foreground">Support data</span> — emails
                  you send us.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                What we don&apos;t do
              </h2>
              <p>
                We don&apos;t sell your data. We don&apos;t run ad networks on
                docs you publish with us. We don&apos;t use your source content
                to train models.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                How long we keep it
              </h2>
              <p>
                Account and project data lives until you delete the account.
                Usage logs are retained for 90 days. Backups roll off on a
                30-day window.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Your rights
              </h2>
              <p>
                You can export or delete your data at any time from the
                dashboard. If you&apos;d prefer we do it for you, email{" "}
                <a
                  className="underline underline-offset-4"
                  href="mailto:privacy@blode.md"
                >
                  privacy@blode.md
                </a>{" "}
                and we&apos;ll handle it within 30 days.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Sub-processors
              </h2>
              <p>
                We use a small list of sub-processors to run the service (cloud
                hosting, analytics, email). A current list is maintained on the
                security page.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Contact
              </h2>
              <p>
                Questions about this policy? Email{" "}
                <a
                  className="underline underline-offset-4"
                  href="mailto:privacy@blode.md"
                >
                  privacy@blode.md
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
