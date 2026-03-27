"use client";

import { CheckIcon, ClipboardIcon } from "blode-icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { getTextContent } from "./get-text-content";

export const CodeBlock = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => getTextContent(children), [children]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = useCallback(async () => {
    if (!code) {
      return;
    }
    await navigator.clipboard.writeText(code);
    setCopied(true);
  }, [code]);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-code text-code-foreground">
      <button
        className="absolute top-3 right-2 z-10 inline-flex size-7 items-center justify-center rounded-md bg-code opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
        data-slot="copy-button"
        onClick={handleCopy}
        type="button"
      >
        <span aria-live="polite" className="sr-only">
          {copied ? "Copied" : "Copy"}
        </span>
        {copied ? (
          <CheckIcon aria-hidden="true" className="size-3.5" />
        ) : (
          <ClipboardIcon aria-hidden="true" className="size-3.5" />
        )}
      </button>
      <pre
        className={cn(
          "no-scrollbar overflow-x-auto px-4 py-3.5 font-mono",
          className
        )}
      >
        {children}
      </pre>
    </div>
  );
};
