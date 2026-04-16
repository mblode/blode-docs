import type { ApiKey } from "@repo/contracts";

import { ApiError, apiFetch } from "@/lib/api-client";

import { requireProjectContext } from "../_lib";
import { ProjectSettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

interface SettingsPageProps {
  params: Promise<{ projectSlug: string }>;
}

const fetchKeys = async (
  projectId: string,
  accessToken: string
): Promise<ApiKey[]> => {
  try {
    return await apiFetch<ApiKey[]>(`/projects/${projectId}/api-keys`, {
      accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return [];
    }
    throw error;
  }
};

export default async function ProjectSettingsPage({
  params,
}: SettingsPageProps) {
  const { projectSlug } = await params;
  const { accessToken, project } = await requireProjectContext(projectSlug);
  const apiKeys = await fetchKeys(project.id, accessToken);

  return (
    <ProjectSettingsForm
      accessToken={accessToken}
      initialApiKeys={apiKeys}
      project={project}
    />
  );
}
