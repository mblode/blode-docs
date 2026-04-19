import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  description:
    "Terms of service for blode.md. The ground rules for using the platform.",
  title: "Terms | Blode.md",
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
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container">
          <div className="measure flex flex-col gap-8 text-muted-foreground leading-relaxed">
            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Agreement
              </h2>
              <p>By using blode.md, you agree to these terms.</p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Your content
              </h2>
              <p>
                You own the content you publish. You grant us the license we
                need to host, build, and serve it. That license ends when you
                remove the content.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Acceptable use
              </h2>
              <p>
                Do not use blode.md for content that is illegal, abusive, or
                that violates someone else&apos;s rights. Do not use it to
                attack or scrape other services.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Termination
              </h2>
              <p>
                You can stop using the service at any time. We can suspend
                accounts that break these terms.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                No warranty
              </h2>
              <p>
                The service is provided as is. We do our best to keep it
                reliable, but cannot guarantee zero downtime.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Changes
              </h2>
              <p>
                If we update these terms, the latest version will live at this
                URL.
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
                  href={`mailto:${siteConfig.links.email}`}
                >
                  {siteConfig.links.email}
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
