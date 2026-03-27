"use client";

import { CheckIcon, ClipboardIcon } from "blode-icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { getTextContent } from "./get-text-content";

interface PromptProps {
  description: string;
  icon?: ReactNode;
  children: ReactNode;
}

export const Prompt = ({ description, icon, children }: PromptProps) => {
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => getTextContent(children), [children]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = useCallback(async () => {
    if (!text) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }, [text]);

  return (
    <div className="my-4 rounded-xl border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border p-4">
        {icon ? (
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-muted-foreground">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1 text-sm text-foreground">
          {description}
        </div>
        <button
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={handleCopy}
          type="button"
        >
          <span className="sr-only">{copied ? "Copied" : "Copy prompt"}</span>
          {copied ? (
            <CheckIcon aria-hidden className="size-3.5" />
          ) : (
            <ClipboardIcon aria-hidden className="size-3.5" />
          )}
        </button>
      </div>
      <div className="p-4 text-sm text-muted-foreground [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
};
