import { BLODE_API_KEY_ENV, OAUTH_CLIENT_ID } from "./constants.js";
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

const sessionToResolvedToken = (
  session: StoredAuthSession
): ResolvedAuthToken => ({
  expiresAt: session.expiresAt,
  source: "stored",
  token: session.accessToken,
  user: session.user,
});

export const resolveAuthToken = async (): Promise<ResolvedAuthToken | null> => {
  const data = await readAuthFile();
  const session = data?.session;

  if (!session) {
    return null;
  }

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

/**
 * The one definition of credential precedence: an explicit `--api-key` wins,
 * then `BLODEMD_API_KEY`, then the stored login session. A blank value counts
 * as unset. Every command that authenticates reads it from here, because three
 * commands deriving it separately is how `whoami` came to report a session
 * while `push` was using a key.
 */
export const resolveApiKeyCredential = (
  apiKeyOption?: string
): string | undefined =>
  (apiKeyOption ?? process.env[BLODE_API_KEY_ENV])?.trim() || undefined;
