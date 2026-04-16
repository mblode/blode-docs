import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase";

import { GithubInstallCallback } from "./callback-client";

export const dynamic = "force-dynamic";

interface CallbackPageProps {
  searchParams: Promise<{
    installation_id?: string;
    setup_action?: string;
    state?: string;
  }>;
}

export default async function GithubCallbackPage({
  searchParams,
}: CallbackPageProps) {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect("/oauth/consent?redirect_to=/app");
  }

  const params = await searchParams;
  const installationIdRaw = params.installation_id;
  const installationId = installationIdRaw
    ? Number(installationIdRaw)
    : Number.NaN;
  const state = params.state ?? "";

  if (!Number.isFinite(installationId) || installationId <= 0) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-12 text-center">
        <h1 className="text-2xl font-semibold">No installation</h1>
        <p className="text-sm text-muted-foreground">
          GitHub didn&apos;t return an installation id. Try again from the
          project Git tab.
        </p>
        <Link className="text-sm underline" href="/app">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <GithubInstallCallback
      accessToken={session.access_token}
      installationId={installationId}
      state={state}
    />
  );
}
