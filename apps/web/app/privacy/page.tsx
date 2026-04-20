import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { MarketingShell } from "@/components/ui/marketing-shell";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  description:
    "Privacy policy for blode.md. What we collect, what we do with it, and how to get in touch.",
  title: "Privacy | Blode.md",
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
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container">
          <div className="measure flex flex-col gap-8 text-muted-foreground leading-relaxed">
            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Scope
              </h2>
              <p>
                This policy covers blode.md, the docs platform at blode.md, and
                the CLI that publishes to it.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                What we collect
              </h2>
              <ul className="flex flex-col gap-2 pl-6 [&_li]:list-disc">
                <li>Your GitHub profile when you sign in.</li>
                <li>The repos, folders, and domains you connect.</li>
                <li>Basic request logs so the service can run.</li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                What we do not do
              </h2>
              <p>
                We do not sell your data. We do not run ad networks on docs you
                publish. We do not use your content to train models.
              </p>
            </div>

            <div>
              <h2 className="mb-2 font-semibold text-foreground text-xl">
                Your data
              </h2>
              <p>
                You can delete your account and data at any time. Need help?
                Email{" "}
                <a
                  className="underline underline-offset-4"
                  href={`mailto:${siteConfig.links.email}`}
                >
                  {siteConfig.links.email}
                </a>
                .
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
