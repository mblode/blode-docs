"use client";

import { useEffect, useState } from "react";

import { RepoPicker } from "@/components/git/repo-picker";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { ApiError, apiFetch } from "@/lib/api-client";

interface GithubInstallCallbackProps {
  accessToken: string;
  installationId: number;
  state: string;
}

interface PendingInstall {
  projectId: string;
  projectSlug: string;
  state: string;
}

export const GithubInstallCallback = ({
  accessToken,
  installationId,
  state,
}: GithubInstallCallbackProps) => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [formError, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const raw = sessionStorage.getItem("blodemd:install-state");
      let pending: PendingInstall | null = null;
      if (raw) {
        try {
          pending = JSON.parse(raw) as PendingInstall;
        } catch {
          pending = null;
        }
      }
      if (pending && pending.state === state && pending.projectId) {
        if (!cancelled) {
          setProjectId(pending.projectId);
          setProjectSlug(pending.projectSlug);
        }
        return;
      }
      try {
        const verified = await apiFetch<{
          projectId: string;
          projectSlug: string;
        }>(`/git/state/${encodeURIComponent(state)}`, { accessToken });
        if (!cancelled) {
          setProjectId(verified.projectId);
          setProjectSlug(verified.projectSlug);
        }
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Couldn't recover the install state. Please retry from the project Git tab.";
        if (!cancelled) {
          setError(message);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, state]);

  if (formError) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardContent className="py-6">
            <FieldError>{formError}</FieldError>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!(projectId && projectSlug)) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <RepoPicker
        accessToken={accessToken}
        installationId={installationId}
        projectId={projectId}
        projectSlug={projectSlug}
      />
    </div>
  );
};
