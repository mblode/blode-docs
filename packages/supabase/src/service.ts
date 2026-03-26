import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database";
import { getServiceSupabaseEnv } from "./env";

export const createServiceSupabaseClient = () => {
  const { url, serviceRoleKey } = getServiceSupabaseEnv();
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
