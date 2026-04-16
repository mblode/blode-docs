import type { Project } from "@repo/contracts";
import { cookies } from "next/headers";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, apiFetch } from "@/lib/api-client";
import { platformRootDomain } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const fetchProjects = async (accessToken: string): Promise<Project[]> => {
  try {
    return await apiFetch<Project[]>("/projects", { accessToken });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return [];
    }
    throw error;
  }
};

export default async function DashboardHomePage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? "";
  const projects = accessToken ? await fetchProjects(accessToken) : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each project is a docs site with its own slug, domains, and deploys.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/new">New project</Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Create your first project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pick a path to get started. We&apos;ll set up your slug, give you
              a preview URL, and walk you through connecting a custom domain.
            </p>
            <Button asChild>
              <Link href="/app/new">Get started</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/app/${project.slug}`}
              className="block rounded-xl border border-border bg-card p-6 transition-colors hover:border-foreground/30"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {project.name}
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.slug}.{platformRootDomain}
              </p>
              {project.description && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
