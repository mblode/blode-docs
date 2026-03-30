import type { UserRecord } from "@repo/db";

import { userDao } from "./db";
import { getSupabaseClient } from "./supabase";

const getTokenFromHeaders = (headers: Record<string, unknown>) => {
  const { authorization } = headers;
  if (typeof authorization === "string") {
    const [scheme, token] = authorization.split(/\s+/, 2);
    if (scheme?.toLowerCase() === "bearer" && token) {
      return token.trim();
    }
  }
  return null;
};

const isJwt = (token: string): boolean => token.startsWith("eyJ");

export const authenticateUser = async (
  headers: Record<string, unknown>
): Promise<UserRecord | null> => {
  const token = getTokenFromHeaders(headers);
  if (!token || !isJwt(token)) {
    return null;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return userDao.upsertByAuthId({
    authId: user.id,
    email: user.email ?? "",
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
  });
};
