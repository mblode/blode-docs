import { mapDeployment } from "@repo/db";
import { Suspense } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { deploymentDao } from "@/lib/db";

import { requireProjectContext } from "../_lib";

interface DeploymentsPageProps {
  params: Promise<{ projectSlug: string }>;
}

const DEPLOYMENTS_PAGE_SIZE = 50;

const STATUS_STYLES: Record<string, string> = {
  building:
    "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-100",
  failed: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-100",
  queued: "bg-muted text-muted-foreground",
  successful:
    "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100",
};

const DeploymentsTableSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </CardContent>
  </Card>
);

const DeploymentsTable = async ({ projectSlug }: { projectSlug: string }) => {
  const { project } = await requireProjectContext(projectSlug);
  const records = await deploymentDao.listByProject(project.id, {
    limit: DEPLOYMENTS_PAGE_SIZE,
  });
  const deployments = records.map(mapDeployment);

  if (deployments.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No deployments yet. Run{" "}
          <code className="font-mono">
            blodemd push docs --project {project.slug}
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
};

export default async function ProjectDeploymentsPage({
  params,
}: DeploymentsPageProps) {
  const { projectSlug } = await params;
  return (
    <Suspense fallback={<DeploymentsTableSkeleton />}>
      <DeploymentsTable projectSlug={projectSlug} />
    </Suspense>
  );
}
