import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const icons: Record<string, string> = {
  danger: "!",
  info: "i",
  success: "\u2713",
  warning: "!",
};

const variantStyles: Record<string, string> = {
  danger: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
  info: "bg-card border-border",
  success:
    "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
  warning:
    "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
};

interface CalloutProps {
  type?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: ReactNode;
}

export const Callout = ({ type = "info", title, children }: CalloutProps) => (
  <div className={cn("flex gap-3 rounded-xl border p-4", variantStyles[type])}>
    <div
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground"
    >
      {icons[type] ?? "i"}
    </div>
    <div>
      {title ? <strong className="mb-1 block">{title}</strong> : null}
      <div>{children}</div>
    </div>
  </div>
);
