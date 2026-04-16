import type { Project } from "@repo/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, apiFetch } from "@/lib/api-client";
import { createSupabaseServerClient } from "@/lib/supabase";

export interface ProjectContext {
  accessToken: string;
  project: Project;
}

export const requireProjectContext = async (
  projectSlug: string
): Promise<ProjectContext> => {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect(`/oauth/consent?redirect_to=/app/${projectSlug}`);
  }

  let projects: Project[] = [];
  try {
    projects = await apiFetch<Project[]>("/projects", {
      accessToken: session.access_token,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/oauth/consent?redirect_to=/app");
    }
    throw error;
  }

  const project = projects.find((candidate) => candidate.slug === projectSlug);
  if (!project) {
    redirect("/app");
  }

  return { accessToken: session.access_token, project };
};
