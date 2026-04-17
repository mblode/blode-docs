import { mapGitConnection } from "@repo/db";
import { Suspense } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ApiError, apiFetch } from "@/lib/api-client";
import { gitConnectionDao } from "@/lib/db";

import { requireProjectContext } from "../_lib";
import { GitConnectionPanel } from "./git-panel";

interface GitPageProps {
  params: Promise<{ projectSlug: string }>;
  searchParams: Promise<{
    code?: string;
    installation_id?: string;
  }>;
}

interface SuggestedInstallation {
  id: number;
  accountLogin: string;
  accountType: string;
}

const fetchFromCode = async (
  accessToken: string,
  code: string
): Promise<SuggestedInstallation[] | null> => {
  try {
    const result = await apiFetch<{ installations: SuggestedInstallation[] }>(
      "/git/installations/from-code",
      { accessToken, body: { code }, method: "POST" }
    );
    return result.installations;
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }
    throw error;
  }
};

const fetchMine = async (
  accessToken: string
): Promise<SuggestedInstallation[]> => {
  try {
    const result = await apiFetch<{ installations: SuggestedInstallation[] }>(
      "/git/installations/mine",
      { accessToken }
    );
    return result.installations;
  } catch (error) {
    if (error instanceof ApiError) {
      return [];
    }
    throw error;
  }
};

const fetchInstallationAccount = async (
  accessToken: string,
  installationId: number
): Promise<SuggestedInstallation | null> => {
  try {
    return await apiFetch<SuggestedInstallation>(
      `/git/installations/${installationId}/account`,
      { accessToken }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }
    throw error;
  }
};

const loadInstallations = async ({
  accessToken,
  code,
  installationId,
}: {
  accessToken: string;
  code: string | null;
  installationId: number | null;
}): Promise<SuggestedInstallation[]> => {
  const primary = code
    ? ((await fetchFromCode(accessToken, code)) ??
      (await fetchMine(accessToken)))
    : await fetchMine(accessToken);

  if (
    installationId !== null &&
    !primary.some((installation) => installation.id === installationId)
  ) {
    const resolved = await fetchInstallationAccount(
      accessToken,
      installationId
    );
    if (resolved) {
      return [resolved, ...primary];
    }
  }
  return primary;
};

const GitPanelSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
    </CardHeader>
    <CardContent>
      <div className="h-32 animate-pulse rounded bg-muted" />
    </CardContent>
  </Card>
);

const GitPanelAsync = async ({
  code,
  installationId,
  projectSlug,
}: {
  code: string | null;
  installationId: number | null;
  projectSlug: string;
}) => {
  const { accessToken, project } = await requireProjectContext(projectSlug);
  const record = await gitConnectionDao.getByProject(project.id);
  const connection = record ? mapGitConnection(record) : null;
  const suggestedInstallations = connection
    ? []
    : await loadInstallations({ accessToken, code, installationId });

  return (
    <GitConnectionPanel
      accessToken={accessToken}
      initialConnection={connection}
      initialInstallationId={installationId}
      project={project}
      suggestedInstallations={suggestedInstallations}
    />
  );
};

export default async function ProjectGitPage({
  params,
  searchParams,
}: GitPageProps) {
  const { projectSlug } = await params;
  const query = await searchParams;
  const installationIdRaw = query.installation_id;
  const parsed = installationIdRaw ? Number(installationIdRaw) : Number.NaN;
  const installationId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  const code = query.code ?? null;

  return (
    <Suspense fallback={<GitPanelSkeleton />}>
      <GitPanelAsync
        code={code}
        installationId={installationId}
        projectSlug={projectSlug}
      />
    </Suspense>
  );
}
