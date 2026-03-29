import { BLODE_TOKEN_ENV, OAUTH_CLIENT_ID } from "./constants.js";
import { parseJwtClaims } from "./jwt.js";
import { refreshAccessToken } from "./oauth-token.js";
import {
  clearStoredCredentials,
  readAuthFile,
  writeStoredAuthSession,
} from "./storage.js";
import {
  buildOAuthUrls,
  resolveSupabaseConfig,
  tokenResponseToStoredSession,
} from "./supabase.js";
import type { ResolvedAuthToken, StoredAuthSession } from "./types.js";

const expiresInMs = (session: StoredAuthSession): number | null => {
  if (!session.expiresAt) {
    return null;
  }

  const expiresAtMs = Date.parse(session.expiresAt);

  if (Number.isNaN(expiresAtMs)) {
    return null;
  }

  return expiresAtMs - Date.now();
};

const isExpired = (session: StoredAuthSession): boolean => {
  const ms = expiresInMs(session);
  return ms !== null && ms <= 0;
};

const shouldRefresh = (session: StoredAuthSession): boolean => {
  const ms = expiresInMs(session);
  return ms !== null && ms <= 60_000;
};

const tokenFromRaw = (
  token: string,
  source: ResolvedAuthToken["source"]
): ResolvedAuthToken => {
  const claims = parseJwtClaims(token);

  const expiresAt =
    typeof claims?.exp === "number"
      ? new Date(claims.exp * 1000).toISOString()
      : null;

  return {
    expiresAt,
    source,
    token,
    user:
      claims?.sub || claims?.email
        ? { email: claims.email ?? null, id: claims.sub ?? "unknown" }
        : null,
  };
};

const sessionToResolvedToken = (
  session: StoredAuthSession
): ResolvedAuthToken => ({
  expiresAt: session.expiresAt,
  source: "stored",
  token: session.accessToken,
  user: session.user,
});

export const resolveAuthToken = async (
  optApiKey?: string
): Promise<ResolvedAuthToken | null> => {
  const envToken = (optApiKey ?? process.env[BLODE_TOKEN_ENV])?.trim();

  if (envToken) {
    return tokenFromRaw(envToken, optApiKey ? "flag" : "environment");
  }

  const data = await readAuthFile();
  const session = data?.session;

  if (session) {
    if (!(shouldRefresh(session) || isExpired(session))) {
      return sessionToResolvedToken(session);
    }

    if (session.refreshToken) {
      try {
        const config = resolveSupabaseConfig();
        const { tokenUrl } = buildOAuthUrls(config);
        const tokenResponse = await refreshAccessToken(
          { clientId: OAUTH_CLIENT_ID, tokenUrl },
          session.refreshToken
        );
        const updatedSession = tokenResponseToStoredSession(tokenResponse);
        await writeStoredAuthSession(updatedSession);

        return sessionToResolvedToken(updatedSession);
      } catch {
        // Refresh failed — fall through to expiry check
      }
    }

    if (isExpired(session)) {
      await clearStoredCredentials();
      return null;
    }

    return sessionToResolvedToken(session);
  }

  if (data?.apiKey) {
    return {
      expiresAt: null,
      source: "stored",
      token: data.apiKey.apiKey,
      user: null,
    };
  }

  return null;
};

export const resolveTokenStatus = (
  token: ResolvedAuthToken
): {
  expiresInSeconds: number | null;
  expired: boolean;
} => {
  if (!token.expiresAt) {
    return { expired: false, expiresInSeconds: null };
  }

  const expiresAtMs = Date.parse(token.expiresAt);

  if (Number.isNaN(expiresAtMs)) {
    return { expired: false, expiresInSeconds: null };
  }

  const expiresInSeconds = Math.floor((expiresAtMs - Date.now()) / 1000);

  return {
    expired: expiresInSeconds <= 0,
    expiresInSeconds,
  };
};
