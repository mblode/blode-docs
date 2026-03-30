import { createClient } from "@supabase/supabase-js";

import { readTrimmedEnv } from "./env";

type SupabaseClient = ReturnType<typeof createClient>;

let supabaseClient: SupabaseClient | null | undefined;

const shouldAllowMissingSupabaseConfig = (): boolean =>
  process.env.NODE_ENV === "test" || process.env.VITEST === "true";

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseClient !== undefined) {
    return supabaseClient;
  }

  const supabaseUrl = readTrimmedEnv("SUPABASE_URL");
  const supabaseServiceRoleKey = readTrimmedEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (!shouldAllowMissingSupabaseConfig()) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
      );
    }

    supabaseClient = null;
    return supabaseClient;
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
};
