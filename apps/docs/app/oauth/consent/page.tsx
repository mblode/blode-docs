import type { Metadata } from "next";

import type { OAuthSearchParams } from "../search-params";
import { getSearchParam } from "../search-params";
import { ConsentForm } from "./consent-form";

export const metadata: Metadata = {
  description: "Sign in with GitHub to access Blode.md.",
  title: "Sign in · Blode.md",
};

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<OAuthSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <ConsentForm
      authorizationId={getSearchParam(resolvedSearchParams, "authorization_id")}
      errorMessage={getSearchParam(resolvedSearchParams, "error")}
    />
  );
}
