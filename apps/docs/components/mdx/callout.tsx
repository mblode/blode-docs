import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const variantStyles: Record<string, string> = {
  check:
    "border-emerald-600 bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-900",
  danger: "border-red-600 bg-red-100 dark:border-red-400 dark:bg-red-900",
  info: "bg-card border-border",
  note: "bg-card border-border",
  success:
    "border-emerald-600 bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-900",
  tip: "border-blue-600 bg-blue-100 dark:border-blue-400 dark:bg-blue-900",
  warning:
    "border-amber-600 bg-amber-100 dark:border-amber-400 dark:bg-amber-900",
};

interface CalloutProps {
  type?: "info" | "success" | "warning" | "danger" | "note" | "tip" | "check";
  title?: string;
  icon?: ReactNode;
  color?: string;
  children: ReactNode;
}

export const Callout = ({
  type = "info",
  title,
  icon,
  color,
  children,
}: CalloutProps) => (
  <div
    data-slot="alert"
    role="alert"
    data-variant="default"
    className={cn(
      "relative grid grid-cols-[0_1fr] items-start gap-y-0.5 rounded-xl border px-4 py-3 text-sm text-surface-foreground",
      "has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3",
      "[&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
      "**:[code]:border md:-mx-1",
      variantStyles[type]
    )}
    style={
      color
        ? {
            backgroundColor: `${color}10`,
            borderColor: color,
          }
        : undefined
    }
  >
    {icon}
    <div
      data-slot="alert-description"
      className="col-start-2 grid justify-items-start gap-1 text-sm text-foreground [&_p]:leading-relaxed"
    >
      {title ? <strong className="font-medium">{title}</strong> : null}
      <div className="text-sm [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&_p]:leading-relaxed [&_p:not(:first-child)]:mt-6">
        {children}
      </div>
    </div>
  </div>
);

export const Note = ({ children }: { children: ReactNode }) => (
  <Callout type="note">{children}</Callout>
);

export const Warning = ({ children }: { children: ReactNode }) => (
  <Callout type="warning">{children}</Callout>
);

export const Info = ({ children }: { children: ReactNode }) => (
  <Callout type="info">{children}</Callout>
);

export const Tip = ({ children }: { children: ReactNode }) => (
  <Callout type="tip">{children}</Callout>
);

export const Check = ({ children }: { children: ReactNode }) => (
  <Callout type="check">{children}</Callout>
);

export const Danger = ({ children }: { children: ReactNode }) => (
  <Callout type="danger">{children}</Callout>
);
