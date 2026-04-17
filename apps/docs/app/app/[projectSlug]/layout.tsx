import { ArrowLeftIcon, ArrowUpRightIcon } from "blode-icons-react";
import Link from "next/link";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { platformRootDomain } from "@/lib/env";

import { requireProjectContext } from "./_lib";
import { ProjectTabs } from "./project-tabs";

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ projectSlug: string }>;
}

const ProjectHeader = async ({ projectSlug }: { projectSlug: string }) => {
  const { project } = await requireProjectContext(projectSlug);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
      <a
        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        href={`https://${project.slug}.${platformRootDomain}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        {project.slug}.{platformRootDomain}
        <ArrowUpRightIcon className="size-3" />
      </a>
    </div>
  );
};

const ProjectHeaderSkeleton = () => (
  <div className="mt-2 flex flex-wrap items-center gap-3">
    <div className="h-8 w-48 animate-pulse rounded bg-muted" />
    <div className="h-6 w-56 animate-pulse rounded-full bg-muted" />
  </div>
);

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { projectSlug } = await params;

  return (
    <div className="space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          href="/app"
        >
          <ArrowLeftIcon className="size-3" />
          All projects
        </Link>
        <Suspense fallback={<ProjectHeaderSkeleton />}>
          <ProjectHeader projectSlug={projectSlug} />
        </Suspense>
      </div>
      <ProjectTabs projectSlug={projectSlug} />
      <div>{children}</div>
    </div>
  );
}
