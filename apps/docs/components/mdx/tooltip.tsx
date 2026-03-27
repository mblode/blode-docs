"use client";

import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";

interface TooltipProps {
  tip: string;
  headline?: string;
  cta?: string;
  href?: string;
  children: ReactNode;
}

export const Tooltip = ({
  tip,
  headline,
  cta,
  href,
  children,
}: TooltipProps) => {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const show = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  return (
    <span className="relative inline-block">
      <button
        className="cursor-help border-b border-dashed border-muted-foreground bg-transparent p-0 text-inherit"
        onBlur={hide}
        onFocus={show}
        onMouseEnter={show}
        onMouseLeave={hide}
        type="button"
      >
        {children}
      </button>
      {open ? (
        <span
          className="absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-64 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
          onMouseEnter={show}
          onMouseLeave={hide}
          role="tooltip"
        >
          {headline ? (
            <span className="mb-1 block font-semibold">{headline}</span>
          ) : null}
          <span className="block">{tip}</span>
          {cta && href ? (
            <a
              className="mt-1 block text-primary hover:underline"
              href={href}
              rel="noopener noreferrer"
            >
              {cta}
            </a>
          ) : null}
        </span>
      ) : null}
    </span>
  );
};
