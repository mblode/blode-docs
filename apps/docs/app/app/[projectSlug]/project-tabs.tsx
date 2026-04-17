"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/deployments", label: "Deployments" },
  { href: "/domains", label: "Domains" },
  { href: "/git", label: "Git" },
  { href: "/settings", label: "Settings" },
] as const;

interface ProjectTabsProps {
  projectSlug: string;
}

export const ProjectTabs = ({ projectSlug }: ProjectTabsProps) => {
  const pathname = usePathname();
  const base = `/app/${projectSlug}`;

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const isActive =
          tab.href === ""
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "rounded-t-md border-b-2 border-foreground px-3 py-2 text-sm text-foreground"
                : "rounded-t-md border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            }
            href={href}
            key={tab.href}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};
