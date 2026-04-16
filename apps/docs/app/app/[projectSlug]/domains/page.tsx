import type { Domain } from "@repo/contracts";

import { ApiError, apiFetch } from "@/lib/api-client";
import { platformRootDomain } from "@/lib/env";

import { requireProjectContext } from "../_lib";
import { DomainsManager } from "./domains-manager";

export const dynamic = "force-dynamic";

interface DomainsPageProps {
  params: Promise<{ projectSlug: string }>;
}

const fetchDomains = async (
  projectId: string,
  accessToken: string
): Promise<Domain[]> => {
  try {
    return await apiFetch<Domain[]>(`/projects/${projectId}/domains`, {
      accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return [];
    }
    throw error;
  }
};

export default async function ProjectDomainsPage({ params }: DomainsPageProps) {
  const { projectSlug } = await params;
  const { accessToken, project } = await requireProjectContext(projectSlug);
  const domains = await fetchDomains(project.id, accessToken);

  return (
    <DomainsManager
      accessToken={accessToken}
      initialDomains={domains}
      project={project}
      rootDomain={platformRootDomain}
    />
  );
}
