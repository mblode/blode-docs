"use client";

import { isValidElement, useCallback, useMemo, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CodeGroupProps {
  children: ReactNode;
}

export const CodeGroup = ({ children }: CodeGroupProps) => {
  const items = useMemo(() => {
    const nodes = Array.isArray(children) ? children : [children];
    return nodes.filter((child): child is ReactElement =>
      isValidElement(child)
    );
  }, [children]);

  const [active, setActive] = useState(0);

  const labels = useMemo(
    () =>
      items.map((item) => {
        if (
          !isValidElement<{
            "data-rehype-pretty-code-title"?: string;
            children?: ReactNode;
          }>(item)
        ) {
          return "Code";
        }
        const title = item.props["data-rehype-pretty-code-title"];
        if (title) {
          return title;
        }
        const itemChildren = Array.isArray(item.props.children)
          ? item.props.children
          : [item.props.children];
        const pre = itemChildren.find(
          (c: unknown) => isValidElement(c) && c.type === "pre"
        );
        if (isValidElement<{ className?: string }>(pre)) {
          const lang = pre.props.className
            ?.split(" ")
            .find((c: string) => c.startsWith("language-"))
            ?.replace("language-", "");
          if (lang) {
            return lang;
          }
        }
        return `Tab ${items.indexOf(item) + 1}`;
      }),
    [items]
  );

  const handleTabClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const index = Number(event.currentTarget.dataset.index ?? "0");
    setActive(index);
  }, []);

  if (items.length <= 1) {
    return children as ReactElement;
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border bg-code">
      <div
        className="flex gap-1 border-b border-border bg-muted/50 px-2 pt-2"
        role="tablist"
      >
        {labels.map((label, index) => (
          <button
            aria-selected={index === active}
            className={cn(
              "rounded-t-md border-b-2 px-3 py-1.5 font-mono text-xs transition-colors",
              index === active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            data-index={index}
            key={label}
            onClick={handleTabClick}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{items[active]}</div>
    </div>
  );
};
