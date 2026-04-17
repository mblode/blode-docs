"use client";

import { useCallback, useEffect, useState } from "react";

import { RepoPicker } from "@/components/git/repo-picker";
import type { RepoPickerInstallation } from "@/components/git/repo-picker";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { ApiError, apiFetch } from "@/lib/api-client";
import {
  GITHUB_INSTALL_STATE_KEY,
  startGithubInstall,
} from "@/lib/github-install";

interface GithubInstallCallbackProps {
  accessToken: string;
  code: string | null;
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
  code,
  installationId,
  state,
}: GithubInstallCallbackProps) => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [installations, setInstallations] = useState<RepoPickerInstallation[]>(
    []
  );
  const [formError, setError] = useState<string | null>(null);
  const [addAccountPending, setAddAccountPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const raw = sessionStorage.getItem(GITHUB_INSTALL_STATE_KEY);
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

  useEffect(() => {
    let cancelled = false;
    const placeholder: RepoPickerInstallation = {
      accountLogin: `Installation #${installationId}`,
      accountType: "Unknown",
      id: installationId,
    };
    const withCurrent = (list: RepoPickerInstallation[]) =>
      list.some((installation) => installation.id === installationId)
        ? list
        : [placeholder, ...list];

    // Prefer the user-OAuth path (mirrors Vercel): exchange the ?code param
    // that GitHub returns when the App has "Request user authorization
    // (OAuth) during installation" enabled. This yields every installation
    // visible to the user — including orgs they belong to.
    const fetchFromCode = async () => {
      if (!code) {
        return null;
      }
      try {
        const result = await apiFetch<{
          installations: RepoPickerInstallation[];
        }>("/git/installations/from-code", {
          accessToken,
          body: { code },
          method: "POST",
        });
        return result.installations ?? [];
      } catch {
        return null;
      }
    };

    const fetchLoginMatch = async () => {
      try {
        const result = await apiFetch<{
          installations: RepoPickerInstallation[];
        }>("/git/installations/mine", { accessToken });
        return result.installations ?? [];
      } catch {
        return null;
      }
    };

    const run = async () => {
      const list = (await fetchFromCode()) ?? (await fetchLoginMatch()) ?? [];
      if (!cancelled) {
        setInstallations(withCurrent(list));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, code, installationId]);

  const handleAddAccount = useCallback(async () => {
    if (!(projectId && projectSlug)) {
      return;
    }
    setAddAccountPending(true);
    try {
      await startGithubInstall({ accessToken, projectId, projectSlug });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not start the GitHub install flow.";
      setError(message);
      setAddAccountPending(false);
    }
  }, [accessToken, projectId, projectSlug]);

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

  if (!(projectId && projectSlug) || installations.length === 0) {
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
        addAccountPending={addAccountPending}
        installations={installations}
        onAddAccount={handleAddAccount}
        projectId={projectId}
        projectSlug={projectSlug}
      />
    </div>
  );
};
