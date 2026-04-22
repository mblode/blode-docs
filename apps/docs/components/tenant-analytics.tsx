import { GoogleAnalytics } from "@next/third-parties/google";
import { headers } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";

import {
  decodeTenantAnalyticsHeader,
  TENANT_HEADERS,
} from "@/lib/tenant-headers";

import { PostHogProvider } from "./posthog-provider";

// Consent Mode v2 default-denied bootstrap. Replace with a real CMP when ready.
const CONSENT_DEFAULTS_SCRIPT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});`;

export const TenantAnalytics = async () => {
  if (process.env.VERCEL_ENV !== "production") {
    return null;
  }

  const headerStore = await headers();
  const analytics = decodeTenantAnalyticsHeader(
    headerStore.get(TENANT_HEADERS.ANALYTICS)
  );
  if (!analytics) {
    return null;
  }

  return (
    <>
      {analytics.ga4?.measurementId ? (
        <>
          <Script id="ga-consent-defaults" strategy="afterInteractive">
            {CONSENT_DEFAULTS_SCRIPT}
          </Script>
          <GoogleAnalytics gaId={analytics.ga4.measurementId} />
        </>
      ) : null}
      {analytics.posthog?.projectKey ? (
        <Suspense fallback={null}>
          <PostHogProvider
            host={analytics.posthog.host}
            projectKey={analytics.posthog.projectKey}
          />
        </Suspense>
      ) : null}
    </>
  );
};
