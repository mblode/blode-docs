import Link from "next/link";
import { redirect } from "next/navigation";

import { getDashboardSession } from "@/lib/dashboard-session";

import { GithubInstallCallback } from "./callback-client";

interface CallbackPageProps {
  searchParams: Promise<{
    code?: string;
    installation_id?: string;
    setup_action?: string;
    state?: string;
  }>;
}

export default async function GithubCallbackPage({
  searchParams,
}: CallbackPageProps) {
  const session = await getDashboardSession();
  if (!session) {
    redirect("/oauth/consent?redirect_to=/app");
  }

  const params = await searchParams;
  const installationIdRaw = params.installation_id;
  const installationId = installationIdRaw
    ? Number(installationIdRaw)
    : Number.NaN;
  const state = params.state ?? "";
  const code = params.code ?? null;

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
      accessToken={session.accessToken}
      code={code}
      installationId={installationId}
      state={state}
    />
  );
}
