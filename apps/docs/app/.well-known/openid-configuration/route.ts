import { NextResponse } from "next/server";

import { MARKETING_ORIGIN, marketingUrl } from "@/lib/marketing-site";

export const dynamic = "force-static";
export const preferredRegion = "home";
export const revalidate = 3600;

const metadata = {
  authorization_endpoint: marketingUrl("/oauth/consent"),
  claims_supported: ["sub", "iss", "aud", "exp", "iat", "email", "name"],
  code_challenge_methods_supported: ["S256"],
  grant_types_supported: ["authorization_code", "refresh_token"],
  id_token_signing_alg_values_supported: ["RS256"],
  issuer: MARKETING_ORIGIN,
  jwks_uri: marketingUrl("/.well-known/jwks.json"),
  response_types_supported: ["code", "id_token", "code id_token"],
  scopes_supported: ["openid", "profile", "email", "offline_access"],
  subject_types_supported: ["public"],
  token_endpoint: marketingUrl("/oauth/token"),
  token_endpoint_auth_methods_supported: [
    "client_secret_basic",
    "client_secret_post",
  ],
  userinfo_endpoint: marketingUrl("/oauth/userinfo"),
};

export const GET = () =>
  new NextResponse(JSON.stringify(metadata, null, 2), {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/json; charset=utf-8",
      "Vercel-CDN-Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
