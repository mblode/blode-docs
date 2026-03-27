"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AccordionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  id?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export const Accordion = ({
  title,
  description,
  defaultOpen = false,
  id,
  icon,
  children,
}: AccordionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const anchorId = id ?? title.toLowerCase().replaceAll(/\s+/g, "-");

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <div className="border-b border-border last:border-b-0" id={anchorId}>
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-4 text-left"
        onClick={toggle}
        type="button"
      >
        {icon ? (
          <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="font-medium">{title}</div>
          {description ? (
            <div className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
        <svg
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-4 text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
};

export const AccordionGroup = ({ children }: { children: ReactNode }) => (
  <div className="my-4 divide-y divide-border rounded-xl border border-border px-4">
    {children}
  </div>
);
