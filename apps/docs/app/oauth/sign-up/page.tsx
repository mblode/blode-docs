import type { Metadata } from "next";

import type { OAuthSearchParams } from "../search-params";
import { getSearchParam, serializeSearchParams } from "../search-params";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  description:
    "Create an account and approve the Blode.md CLI authorization request.",
  title: "Create Account · Blode.md",
};

export default async function OAuthSignUpPage({
  searchParams,
}: {
  searchParams: Promise<OAuthSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <SignUpForm
      authorizationId={getSearchParam(resolvedSearchParams, "authorization_id")}
      searchParamsString={serializeSearchParams(resolvedSearchParams)}
    />
  );
}
