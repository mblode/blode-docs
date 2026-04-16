"use client";

// oxlint-disable eslint-plugin-react-perf/jsx-no-new-function-as-prop -- deferred useCallback refactor
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";

interface GithubInstallCallbackProps {
  accessToken: string;
  installationId: number;
  state: string;
}

interface RepoSummary {
  defaultBranch: string;
  fullName: string;
  private: boolean;
}

interface PendingInstall {
  projectSlug: string;
  state: string;
}

export const GithubInstallCallback = ({
  accessToken,
  installationId,
  state,
}: GithubInstallCallbackProps) => {
  const router = useRouter();
  const [projectSlug, setProjectSlug] = useState<string | null>(null);
  const [repos, setRepos] = useState<RepoSummary[] | null>(null);
  const [formError, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [branch, setBranch] = useState("main");
  const [docsPath, setDocsPath] = useState("docs");
  const [submitting, setSubmitting] = useState(false);

  const projectId = useMemo(() => projectSlug, [projectSlug]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Recover project slug from sessionStorage (set when initiating install).
      const raw = sessionStorage.getItem("blodemd:install-state");
      let pending: PendingInstall | null = null;
      if (raw) {
        try {
          pending = JSON.parse(raw) as PendingInstall;
        } catch {
          pending = null;
        }
      }
      if (pending && pending.state === state) {
        if (!cancelled) {
          setProjectSlug(pending.projectSlug);
        }
      } else {
        // Verify state with API as a fallback.
        try {
          const verified = await apiFetch<{ projectId: string }>(
            `/git/state/${encodeURIComponent(state)}`,
            { accessToken }
          );
          // We have the project ID but not the slug — bounce back with it as path.
          if (!cancelled) {
            setProjectSlug(verified.projectId);
          }
        } catch (error) {
          const message =
            error instanceof ApiError
              ? error.message
              : "Couldn't recover the install state. Please retry from the project Git tab.";
          if (!cancelled) {
            setError(message);
          }
          return;
        }
      }

      try {
        const reposResult = await apiFetch<{ repos: RepoSummary[] }>(
          `/git/installations/${installationId}/repos`,
          { accessToken }
        );
        if (!cancelled) {
          setRepos(reposResult.repos);
          if (reposResult.repos[0]) {
            setSelected(reposResult.repos[0].fullName);
            setBranch(reposResult.repos[0].defaultBranch ?? "main");
          }
        }
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Failed to load repositories.";
        if (!cancelled) {
          setError(message);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, installationId, state]);

  const handleConnect = async () => {
    if (!projectId || !selected) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/projects/${projectId}/git`, {
        accessToken,
        body: {
          branch: branch.trim() || "main",
          docsPath: docsPath.trim() || "docs",
          installationId,
          repository: selected,
        },
        method: "POST",
      });
      sessionStorage.removeItem("blodemd:install-state");
      router.push(`/app/${projectSlug}/git`);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not save connection.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Pick a repository</CardTitle>
          <CardDescription>
            Choose the repo that contains your docs. We&apos;ll deploy on every
            push to the selected branch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {formError && <FieldError>{formError}</FieldError>}
            {repos === null && (
              <p className="text-sm text-muted-foreground">
                Loading installation…
              </p>
            )}
            {repos?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                The Blode.md app isn&apos;t installed on any repos yet. Add at
                least one in GitHub and refresh.
              </p>
            )}
            {repos && repos.length > 0 && (
              <>
                <Field>
                  <FieldLabel htmlFor="repo">Repository</FieldLabel>
                  <select
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    id="repo"
                    onChange={(event) => {
                      setSelected(event.target.value);
                      const next = repos.find(
                        (repo) => repo.fullName === event.target.value
                      );
                      if (next) {
                        setBranch(next.defaultBranch ?? "main");
                      }
                    }}
                    value={selected}
                  >
                    {repos.map((repo) => (
                      <option key={repo.fullName} value={repo.fullName}>
                        {repo.fullName}
                        {repo.private ? " (private)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="branch">Branch</FieldLabel>
                  <Input
                    id="branch"
                    onChange={(event) => setBranch(event.target.value)}
                    value={branch}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="docs-path">Docs path</FieldLabel>
                  <Input
                    id="docs-path"
                    onChange={(event) => setDocsPath(event.target.value)}
                    value={docsPath}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Folder inside the repo with your <code>docs.json</code>.
                  </p>
                </Field>
                <div>
                  <Button
                    disabled={submitting || !selected}
                    onClick={handleConnect}
                    type="button"
                  >
                    {submitting ? "Connecting..." : "Connect repository"}
                  </Button>
                </div>
              </>
            )}
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
};
