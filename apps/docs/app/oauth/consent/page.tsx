import type { Metadata } from "next";

import type { OAuthSearchParams } from "../search-params";
import { getSearchParam, serializeSearchParams } from "../search-params";
import { ConsentForm } from "./consent-form";

export const metadata: Metadata = {
  description: "Sign in and approve the Blode.md CLI authorization request.",
  title: "Authorize CLI · Blode.md",
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
      searchParamsString={serializeSearchParams(resolvedSearchParams)}
    />
  );
}
