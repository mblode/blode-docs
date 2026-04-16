"use client";

// oxlint-disable eslint-plugin-react-perf/jsx-no-new-function-as-prop -- deferred useCallback refactor
// oxlint-disable eslint/no-alert -- inline confirm acceptable for destructive ops in v1
import type { Domain, DomainVerification, Project } from "@repo/contracts";
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

interface DomainsManagerProps {
  accessToken: string;
  initialDomains: Domain[];
  project: Project;
  rootDomain: string;
}

type VerificationState = Record<string, DomainVerification | undefined>;

export const DomainsManager = ({
  accessToken,
  initialDomains,
  project,
  rootDomain,
}: DomainsManagerProps) => {
  const [domains, setDomains] = useState<Domain[]>(initialDomains);
  const [hostname, setHostname] = useState("");
  const [pathPrefix, setPathPrefix] = useState("/docs");
  const [formError, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [verifications, setVerifications] = useState<VerificationState>({});

  const handleAdd = useCallback(async () => {
    setError(null);
    if (!hostname.trim()) {
      setError("Hostname is required.");
      return;
    }
    setIsAdding(true);
    try {
      const created = await apiFetch<{
        domain: Domain;
        verification?: DomainVerification;
      }>(`/projects/${project.id}/domains`, {
        accessToken,
        body: {
          hostname: hostname.trim(),
          pathPrefix: pathPrefix.trim() || undefined,
        },
        method: "POST",
      });
      setDomains((prev) => [...prev, created.domain]);
      if (created.verification) {
        setVerifications((prev) => ({
          ...prev,
          [created.domain.id]: created.verification,
        }));
      }
      setHostname("");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to add domain.";
      setError(message);
    } finally {
      setIsAdding(false);
    }
  }, [accessToken, hostname, pathPrefix, project.id]);

  const handleVerify = useCallback(
    async (domain: Domain) => {
      try {
        const result = await apiFetch<DomainVerification>(
          `/projects/${project.id}/domains/${domain.id}/verify`,
          { accessToken, method: "POST" }
        );
        setVerifications((prev) => ({ ...prev, [domain.id]: result }));
        if (result.verified) {
          setDomains((prev) =>
            prev.map((existing) =>
              existing.id === domain.id
                ? { ...existing, status: "Valid Configuration" }
                : existing
            )
          );
        }
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to verify domain.";
        setError(message);
      }
    },
    [accessToken, project.id]
  );

  const handleRemove = useCallback(
    async (domain: Domain) => {
      if (!window.confirm(`Remove ${domain.hostname}?`)) {
        return;
      }
      try {
        await apiFetch(`/projects/${project.id}/domains/${domain.id}`, {
          accessToken,
          method: "DELETE",
        });
        setDomains((prev) =>
          prev.filter((existing) => existing.id !== domain.id)
        );
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to remove domain.";
        setError(message);
      }
    },
    [accessToken, project.id]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add a custom domain</CardTitle>
          <CardDescription>
            Use the apex (acme.com), a subdomain (docs.acme.com), or proxy at a
            path with /docs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {formError && <FieldError>{formError}</FieldError>}
            <Field>
              <FieldLabel htmlFor="hostname">Hostname</FieldLabel>
              <Input
                id="hostname"
                onChange={(event) => setHostname(event.target.value)}
                placeholder="docs.acme.com"
                value={hostname}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="path-prefix">
                Path prefix (optional)
              </FieldLabel>
              <Input
                id="path-prefix"
                onChange={(event) => setPathPrefix(event.target.value)}
                placeholder="/docs"
                value={pathPrefix}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave blank to host docs at the domain root.
              </p>
            </Field>
            <div>
              <Button disabled={isAdding} onClick={handleAdd} type="button">
                {isAdding ? "Adding..." : "Add domain"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured domains</CardTitle>
          <CardDescription>
            Default subdomain {project.slug}.{rootDomain} is always active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {domains.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom domains yet.
            </p>
          ) : (
            domains.map((domain) => {
              const verification = verifications[domain.id];
              const records = verification?.records ?? [];
              return (
                <div
                  className="space-y-3 rounded-lg border border-border p-4"
                  key={domain.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-sm">{domain.hostname}</div>
                      <div className="text-xs text-muted-foreground">
                        {domain.status}
                        {domain.pathPrefix ? ` · ${domain.pathPrefix}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleVerify(domain)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Verify
                      </Button>
                      <Button
                        onClick={() => handleRemove(domain)}
                        size="sm"
                        type="button"
                        variant="destructiveSecondary"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  {records.length > 0 && (
                    <div className="rounded-md bg-surface p-3 text-xs">
                      <div className="mb-2 font-medium">DNS records</div>
                      <table className="w-full font-mono">
                        <thead className="text-muted-foreground">
                          <tr>
                            <th className="pr-3 text-left">Type</th>
                            <th className="pr-3 text-left">Name</th>
                            <th className="text-left">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((record) => (
                            <tr
                              key={`${record.type}-${record.name}-${record.value}`}
                            >
                              <td className="pr-3 py-1">{record.type}</td>
                              <td className="pr-3 py-1">{record.name}</td>
                              <td className="py-1">
                                <span className="inline-flex items-center gap-2">
                                  {record.value}
                                  <CopyButton
                                    content={record.value}
                                    size="sm"
                                    variant="ghost"
                                  />
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};
