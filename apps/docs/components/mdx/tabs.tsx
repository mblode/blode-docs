"use client";

import { isValidElement, useCallback, useMemo, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TabProps {
  label: string;
  children: ReactNode;
}

export const Tab = ({ children }: TabProps) => (
  <div className="p-4">{children}</div>
);

export const Tabs = ({ children }: { children: ReactNode }) => {
  const items = useMemo(() => {
    const nodes = Array.isArray(children) ? children : [children];
    return nodes.filter((child): child is ReactElement<TabProps> =>
      isValidElement<TabProps>(child)
    );
  }, [children]);

  const [active, setActive] = useState(0);
  const activeItem = items[active];
  const handleTabClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const index = Number(event.currentTarget.dataset.index ?? "0");
    setActive(index);
  }, []);

  if (!items.length) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex gap-2 bg-muted p-2" role="tablist">
        {items.map((item, index) => (
          <button
            aria-selected={index === active}
            className={cn(
              "rounded-full border-none bg-transparent px-3 py-2 text-sm cursor-pointer transition-colors",
              index === active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-index={index}
            key={String(item.key ?? item.props.label)}
            onClick={handleTabClick}
            role="tab"
            type="button"
          >
            {item.props.label}
          </button>
        ))}
      </div>
      <div className="p-4" role="tabpanel">
        {activeItem}
      </div>
    </div>
  );
};
