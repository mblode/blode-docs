import { DEFAULT_SUPABASE_URL } from "./constants.js";
import { parseJwtClaims } from "./jwt.js";
import type { OAuthTokenResponse } from "./oauth-token.js";
import type { StoredAuthSession, SupabaseConfig } from "./types.js";

export const resolveSupabaseConfig = (): SupabaseConfig => {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    DEFAULT_SUPABASE_URL;

  return { url };
};

export const buildOAuthUrls = (
  config: SupabaseConfig
): {
  authorizeUrl: string;
  tokenUrl: string;
} => ({
  authorizeUrl: `${config.url}/auth/v1/oauth/authorize`,
  tokenUrl: `${config.url}/auth/v1/oauth/token`,
});

export const tokenResponseToStoredSession = (
  response: OAuthTokenResponse
): StoredAuthSession => {
  const claims = parseJwtClaims(response.access_token);

  let expiresAt: string | null = null;
  if (typeof claims?.exp === "number") {
    expiresAt = new Date(claims.exp * 1000).toISOString();
  } else if (response.expires_in > 0) {
    expiresAt = new Date(Date.now() + response.expires_in * 1000).toISOString();
  }

  return {
    accessToken: response.access_token,
    createdAt: new Date().toISOString(),
    expiresAt,
    refreshToken: response.refresh_token ?? null,
    user:
      claims?.sub || claims?.email
        ? {
            email: claims.email ?? null,
            id: claims.sub ?? "unknown",
          }
        : null,
  };
};
