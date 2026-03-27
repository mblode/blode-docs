import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FieldBadge {
  label: string;
  className?: string;
}

interface FieldLayoutProps {
  name: string;
  type?: string;
  required?: boolean;
  deprecated?: boolean;
  defaultValue?: string;
  badges?: FieldBadge[];
  children?: ReactNode;
}

export const FieldLayout = ({
  name,
  type,
  required,
  deprecated,
  defaultValue,
  badges,
  children,
}: FieldLayoutProps) => (
  <div className="border-b border-border py-4 first:pt-0 last:border-b-0">
    <div className="flex flex-wrap items-center gap-2">
      {badges
        ?.filter((b) => b.label)
        .map((badge) => (
          <span
            className={cn(
              "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground",
              badge.className
            )}
            key={badge.label}
          >
            {badge.label}
          </span>
        ))}
      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm font-medium">
        {name}
      </code>
      {type ? (
        <span className="text-xs text-muted-foreground">{type}</span>
      ) : null}
      {required ? (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">
          required
        </span>
      ) : null}
      {deprecated ? (
        <span
          className={cn(
            "rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700",
            "dark:bg-amber-900/40 dark:text-amber-300"
          )}
        >
          deprecated
        </span>
      ) : null}
      {defaultValue ? (
        <span className="text-xs text-muted-foreground">
          Default: <code className="font-mono">{defaultValue}</code>
        </span>
      ) : null}
    </div>
    {children ? (
      <div className="mt-2 text-sm text-muted-foreground [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
        {children}
      </div>
    ) : null}
  </div>
);
