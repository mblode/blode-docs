import Link from "next/link";
import { redirect } from "next/navigation";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getDashboardSession } from "@/lib/dashboard-session";

interface CallbackPageProps {
  searchParams: Promise<{
    code?: string;
    installation_id?: string;
    setup_action?: string;
    state?: string;
  }>;
}

const ErrorCard = ({ message }: { message: string }) => (
  <div className="mx-auto max-w-lg space-y-3 py-12 text-center">
    <h1 className="text-2xl font-semibold">Install didn&apos;t complete</h1>
    <p className="text-sm text-muted-foreground">{message}</p>
    <Link className="text-sm underline" href="/app">
      Back to projects
    </Link>
  </div>
);

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
      <ErrorCard message="GitHub didn't return an installation id. Try again from the project Git tab." />
    );
  }

  if (!state) {
    return (
      <ErrorCard message="Missing install state. Try again from the project Git tab." />
    );
  }

  let projectSlug: string;
  try {
    const verified = await apiFetch<{
      projectId: string;
      projectSlug: string;
    }>(`/git/state/${encodeURIComponent(state)}`, {
      accessToken: session.accessToken,
    });
    ({ projectSlug } = verified);
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Couldn't recover the install state. Please retry from the project Git tab.";
    return <ErrorCard message={message} />;
  }

  const query = new URLSearchParams({
    installation_id: String(installationId),
  });
  if (code) {
    query.set("code", code);
  }
  redirect(`/app/${projectSlug}/git?${query.toString()}`);
}
