import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { MarketingShell } from "@/components/ui/marketing-shell";

export const metadata: Metadata = {
  description:
    "Terms of service for blode.md — the ground rules for using the platform, how we handle your content, and the limits on our liability.",
  title: "Terms — Blode.md",
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <section className="pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="container">
          <Badge className="mb-4 font-mono" variant="outline">
            Terms
          </Badge>
          <h1 className="h-display max-w-3xl text-balance font-bold text-4xl md:text-6xl">
            Terms of service
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
                Agreement
              </h2>
              <p>
                By creating an account or using blode.md, you agree to these
                terms. If you&apos;re using the service on behalf of a company,
                you&apos;re agreeing on their behalf.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Your content
              </h2>
              <p>
                You own the content you publish. You grant us a license to host,
                build, and serve it so we can run the service. That license ends
                when you delete the content.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Acceptable use
              </h2>
              <p>
                Don&apos;t use blode.md to host content that&apos;s illegal,
                abusive, or violates third-party rights. Don&apos;t use it to
                attack or scrape other services. We reserve the right to suspend
                accounts that do.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Billing
              </h2>
              <p>
                Paid plans are billed monthly or annually in advance. You can
                cancel at any time; access continues until the end of the
                current period. Refunds are handled case-by-case, and we&apos;re
                usually generous.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Termination
              </h2>
              <p>
                You can delete your account at any time from the dashboard. We
                can terminate accounts that violate these terms with reasonable
                notice.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Warranties and liability
              </h2>
              <p>
                The service is provided &ldquo;as is&rdquo;. We&apos;ll do our
                best to keep it reliable, but we can&apos;t guarantee zero
                downtime. Our liability is capped at the fees you&apos;ve paid
                in the last twelve months.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Changes
              </h2>
              <p>
                If we update these terms, we&apos;ll announce it on the
                changelog and give you at least 30 days&apos; notice before
                material changes take effect.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Contact
              </h2>
              <p>
                Questions? Email{" "}
                <a
                  className="underline underline-offset-4"
                  href="mailto:legal@blode.md"
                >
                  legal@blode.md
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
