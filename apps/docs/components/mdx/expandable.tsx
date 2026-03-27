"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ExpandableProps {
  title?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export const Expandable = ({
  title = "properties",
  defaultOpen = false,
  children,
}: ExpandableProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <div className="mt-2 ml-4 border-l border-border pl-4">
      <button
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={toggle}
        type="button"
      >
        <svg
          aria-hidden
          className={cn(
            "size-3 transition-transform duration-150",
            open && "rotate-90"
          )}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        {open ? "Hide" : "Show"} {title}
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
};
