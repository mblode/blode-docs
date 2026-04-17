"use client";

// oxlint-disable eslint-plugin-react-perf/jsx-no-new-function-as-prop -- deferred useCallback refactor
// oxlint-disable eslint/no-alert -- inline confirm acceptable for destructive ops in v1
import type { GitConnection, Project } from "@repo/contracts";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { ApiError, apiFetch } from "@/lib/api-client";

interface GitConnectionPanelProps {
  accessToken: string;
  initialConnection: GitConnection | null;
  project: Project;
}

export const GitConnectionPanel = ({
  accessToken,
  initialConnection,
  project,
}: GitConnectionPanelProps) => {
  const [connection, setConnection] = useState<GitConnection | null>(
    initialConnection
  );
  const [formError, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleInstall = useCallback(async () => {
    setError(null);
    setPending(true);
    try {
      const result = await apiFetch<{ url: string; state: string }>(
        `/projects/${project.id}/git/install-url`,
        { accessToken, method: "POST" }
      );
      sessionStorage.setItem(
        "blodemd:install-state",
        JSON.stringify({
          projectId: project.id,
          projectSlug: project.slug,
          state: result.state,
        })
      );
      window.location.assign(result.url);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not start the GitHub install flow.";
      setError(message);
      setPending(false);
    }
  }, [accessToken, project.id, project.slug]);

  const handleDisconnect = useCallback(async () => {
    if (!window.confirm("Disconnect this GitHub repository?")) {
      return;
    }
    setError(null);
    try {
      await apiFetch(`/projects/${project.id}/git`, {
        accessToken,
        method: "DELETE",
      });
      setConnection(null);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to disconnect.";
      setError(message);
    }
  }, [accessToken, project.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub</CardTitle>
        <CardDescription>
          Install the Blode.md GitHub App to deploy on every push. No API keys.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {formError && <FieldError>{formError}</FieldError>}
        {connection ? (
          <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
            <div>
              <div className="font-mono">{connection.repository}</div>
              <div className="text-xs text-muted-foreground">
                Branch: {connection.branch} · Path: {connection.docsPath}
              </div>
              <div className="text-xs text-muted-foreground">
                Connected as {connection.accountLogin}
              </div>
            </div>
            <div>
              <Button
                onClick={handleDisconnect}
                size="sm"
                type="button"
                variant="destructiveSecondary"
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Click below to install the Blode.md app on your GitHub account or
              organization. We&apos;ll bring you back here to pick a repo and
              docs path.
            </p>
            <Button disabled={pending} onClick={handleInstall} type="button">
              {pending ? "Redirecting..." : "Install on GitHub"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Already installed on a different project? Reuse the same
              installation here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
