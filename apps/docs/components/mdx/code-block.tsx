"use client";

import { isValidElement, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const LANGUAGE_CLASS_REGEX = /language-([\w-]+)/;

const getCodeString = (node: ReactNode): string => {
  if (typeof node === "string") {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map(getCodeString).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getCodeString(node.props.children);
  }
  return "";
};

const getLanguage = (node: ReactNode): string | undefined => {
  if (isValidElement<{ className?: string; children?: ReactNode }>(node)) {
    const { className } = node.props;
    const match = LANGUAGE_CLASS_REGEX.exec(className ?? "");
    return match?.[1];
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = getLanguage(child);
      if (match) {
        return match;
      }
    }
  }
  return undefined;
};

export const CodeBlock = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => getCodeString(children), [children]);
  const language =
    getLanguage(children) ?? LANGUAGE_CLASS_REGEX.exec(className ?? "")?.[1];

  const handleCopy = useCallback(async () => {
    if (!code) {
      return;
    }
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [code]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-code text-code-foreground">
      <div className="flex items-center justify-between bg-white/[0.06] px-3 py-2 text-xs">
        <span>{language ?? "text"}</span>
        <button
          className="border-none bg-transparent text-inherit cursor-pointer hover:opacity-70"
          onClick={handleCopy}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
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
