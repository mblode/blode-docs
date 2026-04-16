import Link from "next/link";
import type { ReactNode } from "react";

import { platformRootDomain } from "@/lib/env";

import { requireProjectContext } from "./_lib";

export const dynamic = "force-dynamic";

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ projectSlug: string }>;
}

const TABS = [
  { href: "", label: "Overview" },
  { href: "/deployments", label: "Deployments" },
  { href: "/domains", label: "Domains" },
  { href: "/git", label: "Git" },
  { href: "/settings", label: "Settings" },
] as const;

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { projectSlug } = await params;
  const { project } = await requireProjectContext(projectSlug);

  return (
    <div className="space-y-6">
      <div>
        <Link
          className="text-xs text-muted-foreground hover:text-foreground"
          href="/app"
        >
          ← All projects
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <a
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            href={`https://${project.slug}.${platformRootDomain}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {project.slug}.{platformRootDomain} ↗
          </a>
        </div>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((tab) => (
          <Link
            className="rounded-t-md border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            href={`/app/${project.slug}${tab.href}`}
            key={tab.href}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
