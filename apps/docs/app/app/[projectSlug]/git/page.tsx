import { mapGitConnection } from "@repo/db";
import { Suspense } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ApiError, apiFetch } from "@/lib/api-client";
import { gitConnectionDao } from "@/lib/db";

import { requireProjectContext } from "../_lib";
import { GitConnectionPanel } from "./git-panel";

interface GitPageProps {
  params: Promise<{ projectSlug: string }>;
}

interface SuggestedInstallation {
  id: number;
  accountLogin: string;
  accountType: string;
}

const fetchSuggestedInstallations = async (
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

const GitPanelAsync = async ({ projectSlug }: { projectSlug: string }) => {
  const { accessToken, project } = await requireProjectContext(projectSlug);
  const record = await gitConnectionDao.getByProject(project.id);
  const connection = record ? mapGitConnection(record) : null;
  const suggestedInstallations = connection
    ? []
    : await fetchSuggestedInstallations(accessToken);

  return (
    <GitConnectionPanel
      accessToken={accessToken}
      initialConnection={connection}
      project={project}
      suggestedInstallations={suggestedInstallations}
    />
  );
};

export default async function ProjectGitPage({ params }: GitPageProps) {
  const { projectSlug } = await params;
  return (
    <Suspense fallback={<GitPanelSkeleton />}>
      <GitPanelAsync projectSlug={projectSlug} />
    </Suspense>
  );
}
