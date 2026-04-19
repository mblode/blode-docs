import type { Project } from "@repo/contracts";
import { mapProject } from "@repo/db";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getDashboardSession } from "@/lib/dashboard-session";
import { getAuthorizedProjectBySlug } from "@/lib/project-authz";

interface ProjectContext {
  accessToken: string;
  project: Project;
}

export const requireProjectContext = cache(
  async (projectSlug: string): Promise<ProjectContext> => {
    const session = await getDashboardSession();
    if (!session) {
      redirect(`/oauth/consent?redirect_to=/app/${projectSlug}`);
    }

    const authorized = await getAuthorizedProjectBySlug(projectSlug);
    if (!authorized) {
      redirect("/app");
    }

    return {
      accessToken: authorized.accessToken,
      project: mapProject(authorized.project),
    };
  }
);
