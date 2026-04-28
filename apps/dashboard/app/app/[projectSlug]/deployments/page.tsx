import type { Deployment, Project } from "@repo/contracts";
import { mapDeployment } from "@repo/db";
import { BranchIcon, GitCommitVerticalIcon } from "blode-icons-react";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deploymentDao } from "@/lib/db";
import { platformRootDomain } from "@/lib/env";
import { timeAgo } from "@/lib/time-ago";

import { requireProjectContext } from "../_lib";
import { ActionMenu } from "./action-menu";
import type { ActionMenuItem } from "./action-menu";
import { StatusPill } from "./status-pill";

interface DeploymentsPageProps {
  params: Promise<{ projectSlug: string }>;
}

const DEPLOYMENTS_PAGE_SIZE = 50;
const SHORT_ID_LENGTH = 9;

const ENVIRONMENT_LABEL: Record<Deployment["environment"], string> = {
  preview: "Preview",
  production: "Production",
};

const ROW_GRID_CLASS =
  "grid grid-cols-1 items-center gap-y-3 px-4 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.2fr)_auto] lg:gap-x-6";

const formatDuration = (ms: number): string => {
  if (ms < 0) {
    return "";
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
};

const getDuration = (deployment: Deployment): string | null => {
  if (deployment.status !== "Successful" && deployment.status !== "Failed") {
    return null;
  }
  const start = new Date(deployment.createdAt).getTime();
  const end = new Date(deployment.updatedAt).getTime();
  return formatDuration(end - start);
};

const shortId = (id: string) => id.slice(0, SHORT_ID_LENGTH);

const getCurrentDeploymentId = (deployments: Deployment[]): string | null => {
  let currentId: string | null = null;
  let currentPromotedAt = -Infinity;
  for (const deployment of deployments) {
    if (
      deployment.environment !== "production" ||
      deployment.status !== "Successful" ||
      !deployment.promotedAt
    ) {
      continue;
    }
    const promotedAt = new Date(deployment.promotedAt).getTime();
    if (promotedAt > currentPromotedAt) {
      currentPromotedAt = promotedAt;
      currentId = deployment.id;
    }
  }
  return currentId;
};

const getRowActions = (
  deployment: Deployment,
  project: Project
): ActionMenuItem[] => {
  const liveUrl =
    deployment.previewUrl ?? `https://${project.slug}.${platformRootDomain}`;
  const items: ActionMenuItem[] = [
    {
      external: true,
      href: liveUrl,
      label: deployment.previewUrl ? "Visit preview" : "Visit production",
    },
  ];
  if (deployment.manifestUrl) {
    items.push({
      external: true,
      href: deployment.manifestUrl,
      label: "View manifest",
    });
  }
  return items;
};

const EmptyState = ({ project }: { project: Project }) => (
  <Card>
    <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
      <div
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <BranchIcon className="size-5" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-foreground text-sm">
          No deployments yet
        </p>
        <p className="text-muted-foreground text-sm">
          Connect a GitHub repo or push from your terminal to ship docs.
        </p>
      </div>
      <code className="rounded-md bg-surface px-3 py-1.5 font-mono text-foreground text-xs">
        blodemd push docs --project {project.slug}
      </code>
    </CardContent>
  </Card>
);

const DeploymentRow = ({
  deployment,
  isCurrent,
  project,
}: {
  deployment: Deployment;
  isCurrent: boolean;
  project: Project;
}) => {
  const duration = getDuration(deployment);
  const { branch } = deployment;
  const commitMessage = deployment.commitMessage ?? "Manual deploy";

  return (
    <li className={ROW_GRID_CLASS}>
      <div className="flex flex-col gap-1">
        <span className="font-medium font-mono text-foreground text-sm">
          {shortId(deployment.id)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs">
            {ENVIRONMENT_LABEL[deployment.environment]}
          </span>
          {isCurrent ? (
            <Badge className="px-1.5 py-0 text-[10px]" variant="secondary">
              Current
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <StatusPill status={deployment.status} />
        {duration ? (
          <span className="font-mono text-muted-foreground text-xs">
            {duration}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5 text-sm">
        <span className="inline-flex items-center gap-1.5 font-mono text-foreground text-xs">
          <BranchIcon
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          {branch}
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
          <GitCommitVerticalIcon
            aria-hidden="true"
            className="size-3.5 shrink-0"
          />
          <span className="truncate text-foreground">{commitMessage}</span>
        </span>
      </div>

      <div className="text-muted-foreground text-xs">
        {timeAgo(deployment.createdAt)}
      </div>

      <ActionMenu
        items={getRowActions(deployment, project)}
        triggerLabel={`Actions for deployment ${shortId(deployment.id)}`}
      />
    </li>
  );
};

const DeploymentsList = async ({ project }: { project: Project }) => {
  const records = await deploymentDao.listByProject(project.id, {
    limit: DEPLOYMENTS_PAGE_SIZE,
  });
  const deployments = records.map(mapDeployment);

  if (deployments.length === 0) {
    return <EmptyState project={project} />;
  }

  const currentId = getCurrentDeploymentId(deployments);

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {deployments.map((deployment) => (
            <DeploymentRow
              deployment={deployment}
              isCurrent={deployment.id === currentId}
              key={deployment.id}
              project={project}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

const DeploymentRowSkeleton = () => (
  <li className={ROW_GRID_CLASS}>
    <div className="flex flex-col gap-2">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
    </div>
    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
    <div className="flex flex-col gap-2">
      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
    </div>
    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
    <div className="size-8 animate-pulse rounded bg-muted" />
  </li>
);

const DeploymentsListSkeleton = () => (
  <Card>
    <CardContent className="p-0">
      <ul className="divide-y divide-border">
        {[0, 1, 2].map((index) => (
          <DeploymentRowSkeleton key={index} />
        ))}
      </ul>
    </CardContent>
  </Card>
);

const RetentionFooter = () => (
  <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-muted-foreground text-xs">
    <p>
      Deployment retention is enabled for this project — some deployments will
      be deleted after a set time period.
    </p>
    <Button
      asChild
      className="text-muted-foreground"
      size="sm"
      variant="outline"
    >
      <a href="https://blode.md/docs/deployment/push" rel="noopener noreferrer">
        Read deployment docs
      </a>
    </Button>
  </div>
);

const ProjectDeploymentsView = async ({
  projectSlug,
}: {
  projectSlug: string;
}) => {
  const { project } = await requireProjectContext(projectSlug);
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<DeploymentsListSkeleton />}>
        <DeploymentsList project={project} />
      </Suspense>
      <RetentionFooter />
    </div>
  );
};

export default async function ProjectDeploymentsPage({
  params,
}: DeploymentsPageProps) {
  const { projectSlug } = await params;
  return <ProjectDeploymentsView projectSlug={projectSlug} />;
}
