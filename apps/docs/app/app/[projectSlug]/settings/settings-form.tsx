"use client";

// oxlint-disable eslint-plugin-react-perf/jsx-no-new-function-as-prop -- deferred useCallback refactor
import type { ApiKey, Project } from "@repo/contracts";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";

interface ProjectSettingsFormProps {
  accessToken: string;
  initialApiKeys: ApiKey[];
  project: Project;
}

export const ProjectSettingsForm = ({
  accessToken,
  initialApiKeys,
  project,
}: ProjectSettingsFormProps) => {
  const [name, setName] = useState(project.name);
  const [deploymentName, setDeploymentName] = useState(project.deploymentName);
  const [description, setDescription] = useState(project.description ?? "");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSaved, setDetailsSaved] = useState(false);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys);
  const [keyName, setKeyName] = useState("CI");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  const handleSaveDetails = useCallback(async () => {
    setDetailsError(null);
    setDetailsSaved(false);
    setSavingDetails(true);
    try {
      await apiFetch(`/projects/${project.id}`, {
        accessToken,
        body: {
          deploymentName: deploymentName.trim(),
          description: description.trim() || null,
          name: name.trim(),
        },
        method: "PATCH",
      });
      setDetailsSaved(true);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to save changes.";
      setDetailsError(message);
    } finally {
      setSavingDetails(false);
    }
  }, [accessToken, deploymentName, description, name, project.id]);

  const handleCreateKey = useCallback(async () => {
    setKeyError(null);
    setIssuedToken(null);
    setCreatingKey(true);
    try {
      const result = await apiFetch<{ apiKey: ApiKey; token: string }>(
        `/projects/${project.id}/api-keys`,
        {
          accessToken,
          body: { name: keyName.trim() || "CI" },
          method: "POST",
        }
      );
      setApiKeys((prev) => [result.apiKey, ...prev]);
      setIssuedToken(result.token);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to issue API key.";
      setKeyError(message);
    } finally {
      setCreatingKey(false);
    }
  }, [accessToken, keyName, project.id]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
          <CardDescription>
            Slug ({project.slug}) is permanent and used in your subdomain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {detailsError && <FieldError>{detailsError}</FieldError>}
            {detailsSaved && (
              <p className="text-sm text-muted-foreground">Saved.</p>
            )}
            <Field>
              <FieldLabel htmlFor="name">Project name</FieldLabel>
              <Input
                id="name"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="deployment-name">Deployment name</FieldLabel>
              <Input
                id="deployment-name"
                onChange={(event) => setDeploymentName(event.target.value)}
                value={deploymentName}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Shown in the project topbar of deployed docs.
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input
                id="description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional"
                value={description}
              />
            </Field>
            <div>
              <Button
                disabled={
                  savingDetails || !name.trim() || !deploymentName.trim()
                }
                onClick={handleSaveDetails}
                type="button"
              >
                {savingDetails ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API keys (CI only)</CardTitle>
          <CardDescription>
            For most agents and humans, run <code>npx blodemd login</code>{" "}
            instead. Use API keys for GitHub Actions or other unattended
            environments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup>
            {keyError && <FieldError>{keyError}</FieldError>}
            <Field>
              <FieldLabel htmlFor="key-name">Key name</FieldLabel>
              <Input
                id="key-name"
                onChange={(event) => setKeyName(event.target.value)}
                placeholder="CI"
                value={keyName}
              />
            </Field>
            <div>
              <Button
                disabled={creatingKey}
                onClick={handleCreateKey}
                type="button"
              >
                {creatingKey ? "Issuing..." : "Issue new API key"}
              </Button>
            </div>
          </FieldGroup>

          {issuedToken && (
            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
              <div className="font-medium">Copy this token now</div>
              <p className="mt-1 text-xs text-muted-foreground">
                You won&apos;t see it again. Set it as{" "}
                <code className="font-mono">BLODEMD_API_KEY</code>.
              </p>
              <div className="mt-2 flex items-center gap-2 font-mono text-xs">
                <span className="break-all">{issuedToken}</span>
                <CopyButton content={issuedToken} size="sm" variant="ghost" />
              </div>
            </div>
          )}

          {apiKeys.length > 0 && (
            <ul className="divide-y divide-border rounded-md border border-border">
              {apiKeys.map((key) => (
                <li
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  key={key.id}
                >
                  <div>
                    <div className="font-medium">{key.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {key.prefix}…
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {key.revokedAt
                      ? `Revoked ${new Date(key.revokedAt).toLocaleDateString()}`
                      : `Created ${new Date(key.createdAt).toLocaleDateString()}`}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
