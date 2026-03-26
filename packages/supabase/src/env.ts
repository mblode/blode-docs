interface SupabaseEnv {
  url: string;
  anonKey: string;
}

interface SupabaseServiceEnv extends SupabaseEnv {
  serviceRoleKey: string;
}

const requireEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }
  return value;
};

export const getPublicSupabaseEnv = (): SupabaseEnv => ({
  anonKey: requireEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ),
  url: requireEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL"
  ),
});

export const getServiceSupabaseEnv = (): SupabaseServiceEnv => ({
  ...getPublicSupabaseEnv(),
  serviceRoleKey: requireEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY"
  ),
});
