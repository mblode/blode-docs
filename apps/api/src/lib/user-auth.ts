import type { UserRecord } from "@repo/db";

import { userDao } from "./db";
import { getBearerToken } from "./header-auth";
import { getSupabaseClient } from "./supabase";

const isJwt = (token: string): boolean => token.startsWith("eyJ");

const getUserEmail = (user: { email?: string | null; id: string }) => {
  const email = user.email?.trim().toLowerCase();
  if (email) {
    return email;
  }

  return `${user.id}@users.blode.invalid`;
};

export const authenticateUser = async (
  headers: Record<string, unknown>
): Promise<UserRecord | null> => {
  const token = getBearerToken(headers);
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
    email: getUserEmail(user),
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
  });
};
