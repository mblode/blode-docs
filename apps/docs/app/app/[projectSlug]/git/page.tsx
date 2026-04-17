import { mapGitConnection } from "@repo/db";

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

export default async function ProjectGitPage({ params }: GitPageProps) {
  const { projectSlug } = await params;
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
}
