import type { GitConnection } from "@repo/contracts";

import { ApiError, apiFetch } from "@/lib/api-client";

import { requireProjectContext } from "../_lib";
import { GitConnectionPanel } from "./git-panel";

export const dynamic = "force-dynamic";

interface GitPageProps {
  params: Promise<{ projectSlug: string }>;
}

const fetchConnection = async (
  projectId: string,
  accessToken: string
): Promise<GitConnection | null> => {
  try {
    return await apiFetch<GitConnection | null>(`/projects/${projectId}/git`, {
      accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }
    throw error;
  }
};

export default async function ProjectGitPage({ params }: GitPageProps) {
  const { projectSlug } = await params;
  const { accessToken, project } = await requireProjectContext(projectSlug);
  const connection = await fetchConnection(project.id, accessToken);

  return (
    <GitConnectionPanel
      accessToken={accessToken}
      initialConnection={connection}
      project={project}
    />
  );
}
