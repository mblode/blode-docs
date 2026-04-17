"use client";

// oxlint-disable eslint-plugin-react-perf/jsx-no-new-function-as-prop -- deferred useCallback refactor
import type { GitConnection } from "@repo/contracts";
import {
  CheckIcon,
  ChevronDownIcon,
  GithubIcon,
  LockIcon,
  PlusIcon,
  SearchIcon,
} from "blode-icons-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ApiError, apiFetch } from "@/lib/api-client";
import { GITHUB_INSTALL_STATE_KEY } from "@/lib/github-install";
import { timeAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

export interface RepoPickerInstallation {
  id: number;
  accountLogin: string;
  accountType: string;
}

export interface RepoPickerProps {
  accessToken: string;
  installations: RepoPickerInstallation[];
  onAddAccount: () => void;
  projectId: string;
  projectSlug: string;
  addAccountPending?: boolean;
  initialInstallationId?: number | null;
  onConnected?: (connection: GitConnection) => void;
}

interface RepoSummary {
  defaultBranch: string;
  fullName: string;
  private: boolean;
  pushedAt: string | null;
}

const GithubAvatar = ({
  className,
  login,
  size = 24,
}: {
  className?: string;
  login: string;
  size?: number;
}) => (
  <Image
    alt=""
    className={cn(
      "shrink-0 rounded-full bg-muted ring-1 ring-black/5",
      className
    )}
    height={size}
    src={`https://github.com/${login}.png?size=${size * 2}`}
    unoptimized
    width={size}
  />
);

const ConfigureRepoCard = ({
  branch,
  docsPath,
  formError,
  onBranchChange,
  onChangeRepo,
  onConnect,
  onDocsPathChange,
  selected,
  submitting,
}: {
  branch: string;
  docsPath: string;
  formError: string | null;
  onBranchChange: (value: string) => void;
  onChangeRepo: () => void;
  onConnect: () => void;
  onDocsPathChange: (value: string) => void;
  selected: RepoSummary;
  submitting: boolean;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Configure repository</CardTitle>
      <CardDescription>
        Set the branch and docs folder for this project.
      </CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-md border border-border bg-card px-4 py-3">
        <GithubAvatar
          className="size-6"
          login={selected.fullName.split("/")[0] ?? ""}
        />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate text-sm font-medium">
            {selected.fullName}
          </span>
          {selected.private && (
            <LockIcon className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </div>
        <Button onClick={onChangeRepo} size="sm" type="button" variant="ghost">
          Change
        </Button>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="branch">Branch</FieldLabel>
          <Input
            id="branch"
            onChange={(event) => onBranchChange(event.target.value)}
            value={branch}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="docs-path">Docs path</FieldLabel>
          <Input
            id="docs-path"
            onChange={(event) => onDocsPathChange(event.target.value)}
            value={docsPath}
          />
          <FieldDescription>
            Folder inside the repo with your <code>docs.json</code>.
          </FieldDescription>
        </Field>
      </FieldGroup>
      {formError && <FieldError>{formError}</FieldError>}
      <div>
        <Button disabled={submitting} onClick={onConnect} type="button">
          {submitting ? "Connecting..." : "Connect repository"}
        </Button>
      </div>
    </CardContent>
  </Card>
);

const RepoRow = ({
  onImport,
  repo,
}: {
  onImport: () => void;
  repo: RepoSummary;
}) => {
  const name = repo.fullName.split("/")[1] ?? repo.fullName;
  const ago = timeAgo(repo.pushedAt);
  return (
    <div className="flex items-center gap-4 bg-card px-4 py-3">
      <GithubAvatar
        className="size-6"
        login={repo.fullName.split("/")[0] ?? ""}
      />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-sm font-medium" title={repo.fullName}>
          {name}
        </span>
        {repo.private && (
          <LockIcon className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        {ago && (
          <>
            <span
              aria-hidden="true"
              className="hidden text-muted-foreground sm:inline"
            >
              ·
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {ago}
            </span>
          </>
        )}
      </div>
      <Button
        aria-label={`Import ${repo.fullName}`}
        onClick={onImport}
        size="sm"
        type="button"
      >
        Import
      </Button>
    </div>
  );
};

const AccountPicker = ({
  addAccountPending,
  installations,
  onAddAccount,
  onSelect,
  selectedId,
}: {
  addAccountPending?: boolean;
  installations: RepoPickerInstallation[];
  onAddAccount: () => void;
  onSelect: (id: number) => void;
  selectedId: number | null;
}) => {
  const [open, setOpen] = useState(false);
  const selected =
    installations.find((installation) => installation.id === selectedId) ??
    null;

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        aria-label="Select GitHub account"
        className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-background px-3 text-sm outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        type="button"
      >
        {selected ? (
          <GithubAvatar className="size-5" login={selected.accountLogin} />
        ) : (
          <GithubIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate font-medium">
          {selected?.accountLogin ?? "Select account"}
        </span>
        <ChevronDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(20rem,var(--available-width,20rem))] p-0"
      >
        <Command>
          <CommandInput placeholder="Search accounts…" />
          <CommandList>
            <CommandEmpty>No accounts match.</CommandEmpty>
            {installations.length > 0 && (
              <CommandGroup>
                {installations.map((installation) => (
                  <CommandItem
                    key={installation.id}
                    onSelect={() => {
                      onSelect(installation.id);
                      setOpen(false);
                    }}
                    value={installation.accountLogin}
                  >
                    <GithubAvatar
                      className="size-5"
                      login={installation.accountLogin}
                    />
                    <span className="truncate">
                      {installation.accountLogin}
                    </span>
                    <CheckIcon
                      className={cn(
                        "ml-auto size-4",
                        installation.id === selectedId
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {installations.length > 0 && <CommandSeparator />}
            <CommandGroup forceMount>
              <CommandItem
                disabled={addAccountPending}
                forceMount
                onSelect={() => {
                  setOpen(false);
                  onAddAccount();
                }}
                value="Add GitHub Account"
              >
                <PlusIcon className="size-4" />
                <span>
                  {addAccountPending ? "Redirecting…" : "Add GitHub Account"}
                </span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const RepoPicker = ({
  accessToken,
  addAccountPending,
  initialInstallationId = null,
  installations,
  onAddAccount,
  onConnected,
  projectId,
  projectSlug,
}: RepoPickerProps) => {
  const router = useRouter();
  const preselected =
    initialInstallationId !== null &&
    installations.some((i) => i.id === initialInstallationId)
      ? initialInstallationId
      : (installations[0]?.id ?? null);
  const [selectedInstallationId, setSelectedInstallationId] = useState<
    number | null
  >(preselected);
  const [repos, setRepos] = useState<RepoSummary[] | null>(null);
  const [formError, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RepoSummary | null>(null);
  const [branch, setBranch] = useState("main");
  const [docsPath, setDocsPath] = useState("docs");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!installations.some((i) => i.id === selectedInstallationId)) {
      setSelectedInstallationId(installations[0]?.id ?? null);
    }
  }, [installations, selectedInstallationId]);

  useEffect(() => {
    if (selectedInstallationId === null) {
      setRepos(null);
      return;
    }
    let cancelled = false;
    setRepos(null);
    setSelected(null);
    setError(null);
    const run = async () => {
      try {
        const reposResult = await apiFetch<{ repos: RepoSummary[] }>(
          `/git/installations/${selectedInstallationId}/repos`,
          { accessToken }
        );
        if (!cancelled) {
          setRepos(reposResult.repos);
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
  }, [accessToken, selectedInstallationId]);

  const handlePick = (repo: RepoSummary) => {
    setSelected(repo);
    setBranch(repo.defaultBranch || "main");
    setError(null);
  };

  const handleConnect = async () => {
    if (!(selected && selectedInstallationId !== null)) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const connection = await apiFetch<GitConnection>(
        `/projects/${projectId}/git`,
        {
          accessToken,
          body: {
            branch: branch.trim() || "main",
            docsPath: docsPath.trim() || "docs",
            installationId: selectedInstallationId,
            repository: selected.fullName,
          },
          method: "POST",
        }
      );
      sessionStorage.removeItem(GITHUB_INSTALL_STATE_KEY);
      if (onConnected) {
        onConnected(connection);
      } else {
        router.push(`/app/${projectSlug}/git`);
        router.refresh();
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not save connection.";
      setError(message);
      setSubmitting(false);
    }
  };

  const filtered =
    repos?.filter((repo) =>
      repo.fullName.toLowerCase().includes(search.trim().toLowerCase())
    ) ?? [];

  if (selected) {
    return (
      <ConfigureRepoCard
        branch={branch}
        docsPath={docsPath}
        formError={formError}
        onBranchChange={setBranch}
        onChangeRepo={() => setSelected(null)}
        onConnect={handleConnect}
        onDocsPathChange={setDocsPath}
        selected={selected}
        submitting={submitting}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Git repository</CardTitle>
        <CardDescription>
          Choose the repo with your docs. We&apos;ll deploy on every push to the
          selected branch.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <AccountPicker
              addAccountPending={addAccountPending}
              installations={installations}
              onAddAccount={onAddAccount}
              onSelect={setSelectedInstallationId}
              selectedId={selectedInstallationId}
            />
          </div>
          <div className="relative flex-1">
            <SearchIcon
              aria-hidden="true"
              className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground"
            />
            <Input
              aria-label="Search repositories"
              className="pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search…"
              type="search"
              value={search}
            />
          </div>
        </div>

        {formError && <FieldError>{formError}</FieldError>}

        {selectedInstallationId === null && (
          <p className="text-sm text-muted-foreground">
            Select a GitHub account to see repositories.
          </p>
        )}

        {selectedInstallationId !== null && repos === null && !formError && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {repos?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            The Blode.md app isn&apos;t installed on any repos in this account
            yet. Add at least one in GitHub and refresh.
          </p>
        )}

        {repos && repos.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No repositories match &quot;{search}&quot;.
          </p>
        )}

        {filtered.length > 0 && (
          <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {filtered.map((repo) => (
              <RepoRow
                key={repo.fullName}
                onImport={() => handlePick(repo)}
                repo={repo}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
