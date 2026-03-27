import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const colorStyles: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  gray: "bg-muted text-muted-foreground",
  green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  orange:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  purple:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  surface: "bg-card text-card-foreground",
  white: "bg-white text-foreground dark:bg-white dark:text-black",
  yellow:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
};

const strokeStyles: Record<string, string> = {
  blue: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300",
  gray: "border-border text-muted-foreground",
  green:
    "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300",
  orange:
    "border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300",
  purple:
    "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300",
  red: "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300",
  surface: "border-border text-card-foreground",
  white: "border-border text-foreground",
  yellow:
    "border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300",
};

const sizeStyles: Record<string, string> = {
  lg: "px-3 py-1.5 text-sm",
  md: "px-2.5 py-1 text-xs",
  sm: "px-2 py-0.5 text-xs",
  xs: "px-1.5 py-0.5 text-[10px]",
};

interface BadgeProps {
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  shape?: "rounded" | "pill";
  icon?: ReactNode;
  stroke?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export const Badge = ({
  color = "gray",
  size = "md",
  shape = "rounded",
  icon,
  stroke = false,
  disabled = false,
  className,
  children,
}: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 font-medium",
      shape === "pill" ? "rounded-full" : "rounded-md",
      stroke
        ? cn("border bg-transparent", strokeStyles[color] ?? strokeStyles.gray)
        : (colorStyles[color] ?? colorStyles.gray),
      sizeStyles[size] ?? sizeStyles.md,
      disabled && "opacity-50",
      className
    )}
  >
    {icon ? <span className="shrink-0">{icon}</span> : null}
    {children}
  </span>
);
