import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database";
import { getPublicSupabaseEnv } from "./env";

export const createBrowserSupabaseClient = () => {
  const { url, anonKey } = getPublicSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
};
