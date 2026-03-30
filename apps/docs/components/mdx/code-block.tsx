"use client";

import { CheckIcon, ClipboardIcon } from "blode-icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { getTextContent } from "./get-text-content";

export const CodeBlock = ({
  children,
  className,
  style,
  tabIndex,
  ...props
}: ComponentPropsWithoutRef<"pre"> & {
  children: ReactNode;
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

  const preStyle = style ? { ...style } : undefined;
  if (preStyle) {
    delete preStyle.backgroundColor;
  }

  return (
    <figure data-rehype-pretty-code-figure="">
      <pre
        className={cn(
          "no-scrollbar min-w-0 overflow-x-auto overflow-y-auto overscroll-y-auto overscroll-x-contain px-4 py-3.5 outline-none has-[[data-slot=tabs]]:p-0 has-[[data-highlighted-line]]:px-0 has-[[data-line-numbers]]:px-0",
          className
        )}
        style={preStyle}
        tabIndex={tabIndex ?? 0}
        {...props}
      >
        <Button
          className="absolute top-3 right-2 z-10 size-7 bg-code hover:opacity-100 focus-visible:opacity-100"
          data-copied={copied}
          data-slot="copy-button"
          onClick={handleCopy}
          size="icon"
          type="button"
          variant="ghost"
        >
          <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
          {copied ? (
            <CheckIcon aria-hidden="true" />
          ) : (
            <ClipboardIcon aria-hidden="true" />
          )}
        </Button>
        {children}
      </pre>
    </figure>
  );
};
