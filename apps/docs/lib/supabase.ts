import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let browserClient: SupabaseClient | null = null;

export const createSupabaseClient = (): SupabaseClient => {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
};

interface CookieStore {
  get: (name: string) => { value: string } | undefined;
  set?: (name: string, value: string, options?: CookieOptions) => void;
}

export const createSupabaseServerClient = (
  cookieStore: CookieStore
): SupabaseClient =>
  createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      remove(name: string, options?: CookieOptions) {
        cookieStore.set?.(name, "", { ...options, maxAge: 0 });
      },
      set(name: string, value: string, options?: CookieOptions) {
        cookieStore.set?.(name, value, options);
      },
    },
  });
