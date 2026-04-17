"use client";

// oxlint-disable eslint-plugin-react-perf/jsx-no-new-function-as-prop -- inline handlers in per-row controls are acceptable
import type { Domain, DomainVerification, Project } from "@repo/contracts";
import {
  CircleCheckIcon,
  PlusIcon,
  RefreshCcwIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "blode-icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface DomainsManagerProps {
  accessToken: string;
  initialDomains: Domain[];
  project: Project;
  rootDomain: string;
}

type VerificationState = Record<string, DomainVerification | undefined>;
type Mode = "subdomain" | "subpath";

const DEFAULT_PATH_PREFIX = "/docs";

interface SettingsRowProps {
  children: React.ReactNode;
  description: React.ReactNode;
  title: string;
}

const SettingsRow = ({ children, description, title }: SettingsRowProps) => (
  <div className="grid grid-cols-1 gap-x-12 gap-y-4 py-8 md:grid-cols-8">
    <div className="flex flex-col gap-1 md:col-span-3">
      <h2 className="text-base text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="md:col-span-5">{children}</div>
  </div>
);

const UrlPrefixedInput = ({
  className,
  ...props
}: React.ComponentProps<"input">) => (
  <div className={cn("flex h-10 flex-1 items-stretch", className)}>
    <div className="flex shrink-0 select-none items-center rounded-l-xl border-y border-l border-input px-3 text-sm text-muted-foreground">
      https://
    </div>
    <Input
      className="h-10 rounded-l-none rounded-r-xl"
      type="text"
      {...props}
    />
  </div>
);

interface StatusPillProps {
  pathPrefix?: string | null;
  status: Domain["status"];
}

const STATUS_CONFIG = {
  "Invalid Configuration": {
    Icon: TriangleAlertIcon,
    label: "DNS configurations required",
    variant: "outline",
  },
  "Pending Verification": {
    Icon: TriangleAlertIcon,
    label: "Pending verification",
    variant: "warning",
  },
  "Valid Configuration": {
    Icon: CircleCheckIcon,
    label: "Valid Configuration",
    variant: "success",
  },
} as const;

const StatusPill = ({ pathPrefix, status }: StatusPillProps) => {
  const { Icon, label, variant } = STATUS_CONFIG[status];

  return (
    <Badge variant={variant}>
      <Icon />
      <span>
        {label}
        {pathPrefix ? ` · ${pathPrefix}` : ""}
      </span>
    </Badge>
  );
};

export const DomainsManager = ({
  accessToken,
  initialDomains,
  project,
  rootDomain,
}: DomainsManagerProps) => {
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>(initialDomains);
  const [hostname, setHostname] = useState("");
  const [mode, setMode] = useState<Mode>("subdomain");
  const [formError, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [verifications, setVerifications] = useState<VerificationState>({});
  const [pendingRemove, setPendingRemove] = useState<Domain | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    if (isAdding) {
      return;
    }
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
          pathPrefix: mode === "subpath" ? DEFAULT_PATH_PREFIX : undefined,
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
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to add domain.";
      setError(message);
    } finally {
      setIsAdding(false);
    }
  }, [accessToken, hostname, isAdding, mode, project.id, router]);

  const handleVerify = useCallback(
    async (domain: Domain) => {
      setVerifyingId(domain.id);
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
      } finally {
        setVerifyingId(null);
      }
    },
    [accessToken, project.id]
  );

  const confirmRemove = useCallback(async () => {
    if (!pendingRemove) {
      return;
    }
    const target = pendingRemove;
    setPendingRemove(null);
    try {
      await apiFetch(`/projects/${project.id}/domains/${target.id}`, {
        accessToken,
        method: "DELETE",
      });
      setDomains((prev) =>
        prev.filter((existing) => existing.id !== target.id)
      );
      setVerifications((prev) => {
        const { [target.id]: _removed, ...next } = prev;
        return next;
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to remove domain.";
      setError(message);
    }
  }, [accessToken, pendingRemove, project.id, router]);

  const defaultHost = `${project.slug}.${rootDomain}`;

  return (
    <div className="flex flex-col divide-y divide-border">
      <SettingsRow
        title="Set up your custom domain"
        description={
          <>
            This domain will be assigned to your production deployment. The
            default subdomain{" "}
            <span className="font-mono text-foreground">{defaultHost}</span> is
            always active.
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="flex flex-1 flex-col gap-1">
              <h3 className="text-sm font-medium text-foreground">
                Enter your domain URL
              </h3>
              <p className="text-sm text-muted-foreground">
                You can host your domain as a subdomain or a subpath.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">Host at</span>
              <code className="rounded-md bg-foreground/10 px-1.5 py-0.5 font-mono text-xs text-foreground">
                {DEFAULT_PATH_PREFIX}
              </code>
              <Switch
                checked={mode === "subpath"}
                onCheckedChange={(checked) =>
                  setMode(checked ? "subpath" : "subdomain")
                }
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <div className="flex items-center gap-2">
              <UrlPrefixedInput
                disabled={isAdding}
                onChange={(event) => setHostname(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="docs.yourdomain.com"
                value={hostname}
              />
              <Button
                className="h-10 rounded-xl"
                disabled={isAdding}
                onClick={handleAdd}
                type="button"
              >
                <PlusIcon className="size-[18px]" />
                {isAdding ? "Adding..." : "Add domain"}
              </Button>
            </div>
          </div>
        </div>
      </SettingsRow>

      {domains.map((domain) => {
        const verification = verifications[domain.id];
        const records = verification?.records ?? [];
        const isVerifying = verifyingId === domain.id;

        return (
          <SettingsRow
            key={domain.id}
            title="Custom domain"
            description={
              <>
                <span className="font-mono text-foreground">
                  {domain.hostname}
                </span>{" "}
                is linked to this project.
              </>
            }
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <UrlPrefixedInput
                    className="flex-1"
                    disabled
                    readOnly
                    value={domain.hostname}
                  />
                  <Button
                    aria-label={`Remove ${domain.hostname}`}
                    className="size-[38px] rounded-xl"
                    onClick={() => setPendingRemove(domain)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Verify ${domain.hostname}`}
                    className="size-[38px] rounded-xl"
                    disabled={isVerifying}
                    onClick={() => handleVerify(domain)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <RefreshCcwIcon
                      className={cn("size-4", isVerifying && "animate-spin")}
                    />
                  </Button>
                </div>
                <StatusPill
                  pathPrefix={domain.pathPrefix}
                  status={domain.status}
                />
              </div>

              {records.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5 text-sm">
                    <h3 className="text-foreground">DNS Configuration</h3>
                    <p className="text-muted-foreground">
                      Add the following records to your DNS configuration to
                      deploy your documentation on this domain.
                    </p>
                  </div>
                  <div className="relative w-full overflow-auto rounded-xl ring-1 ring-inset ring-foreground/10">
                    <table className="w-full caption-bottom text-sm">
                      <thead>
                        <tr className="border-b border-foreground/10">
                          <th className="h-10 w-[80px] px-4 text-left align-middle font-medium text-foreground">
                            Type
                          </th>
                          <th className="h-10 px-4 text-left align-middle font-medium text-foreground">
                            Name
                          </th>
                          <th className="h-10 px-4 text-left align-middle font-medium text-foreground">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-xs text-muted-foreground">
                        {records.map((record) => (
                          <tr
                            className="border-b border-foreground/10 last:border-b-0"
                            key={`${record.type}-${record.name}-${record.value}`}
                          >
                            <td className="p-4 align-middle">{record.type}</td>
                            <td className="p-4 align-middle break-all">
                              {record.name}
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-start gap-2">
                                <span className="inline-flex rounded-md border border-foreground/10 bg-foreground/[0.03] px-1.5 py-px break-all">
                                  {record.value}
                                </span>
                                <CopyButton
                                  className="shrink-0"
                                  content={record.value}
                                  size="xs"
                                  variant="ghost"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </SettingsRow>
        );
      })}

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemove(null);
          }
        }}
        open={pendingRemove !== null}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <TriangleAlertIcon className="size-5 text-destructive" />
              </div>
              <div className="flex flex-col gap-2">
                <DialogTitle>
                  Remove {pendingRemove?.hostname ?? "domain"}?
                </DialogTitle>
                <DialogDescription>
                  Existing links to this domain may break. Re-adding the domain
                  may require reconfiguration.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setPendingRemove(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={confirmRemove} type="button" variant="destructive">
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
