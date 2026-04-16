import type { Deployment } from "@repo/contracts";

import { Card, CardContent } from "@/components/ui/card";
import { ApiError, apiFetch } from "@/lib/api-client";

import { requireProjectContext } from "../_lib";

export const dynamic = "force-dynamic";

interface DeploymentsPageProps {
  params: Promise<{ projectSlug: string }>;
}

const fetchDeployments = async (
  projectId: string,
  accessToken: string
): Promise<Deployment[]> => {
  try {
    return await apiFetch<Deployment[]>(`/projects/${projectId}/deployments`, {
      accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return [];
    }
    throw error;
  }
};

const STATUS_STYLES: Record<string, string> = {
  building:
    "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-100",
  failed: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-100",
  queued: "bg-muted text-muted-foreground",
  successful:
    "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100",
};

export default async function ProjectDeploymentsPage({
  params,
}: DeploymentsPageProps) {
  const { projectSlug } = await params;
  const { accessToken, project } = await requireProjectContext(projectSlug);
  const deployments = await fetchDeployments(project.id, accessToken);

  if (deployments.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No deployments yet. Run{" "}
          <code className="font-mono">
            npx blodemd push docs --project {project.slug}
          </code>{" "}
          or install the GitHub app.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Deployment</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((deployment) => (
              <tr
                className="border-b border-border last:border-0"
                key={deployment.id}
              >
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {deployment.commitMessage ?? "Manual deploy"}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {deployment.id.slice(0, 8)}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {deployment.branch}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      STATUS_STYLES[deployment.status] ?? "bg-muted"
                    }`}
                  >
                    {deployment.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(deployment.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
