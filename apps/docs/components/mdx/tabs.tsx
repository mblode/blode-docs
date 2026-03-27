"use client";

import { isValidElement, useCallback, useMemo, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TabProps {
  title?: string;
  label?: string;
  icon?: ReactNode;
  id?: string;
  children: ReactNode;
}

export const Tab = ({ children }: TabProps) => (
  <div className="p-4">{children}</div>
);

interface TabsProps {
  children: ReactNode;
  defaultTabIndex?: number;
  borderBottom?: boolean;
}

export const Tabs = ({
  children,
  defaultTabIndex = 0,
  borderBottom,
}: TabsProps) => {
  const items = useMemo(() => {
    const nodes = Array.isArray(children) ? children : [children];
    return nodes.filter((child): child is ReactElement<TabProps> =>
      isValidElement<TabProps>(child)
    );
  }, [children]);

  const [active, setActive] = useState(defaultTabIndex);
  const activeItem = items[active];
  const handleTabClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const index = Number(event.currentTarget.dataset.index ?? "0");
    setActive(index);
  }, []);

  if (!items.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface",
        borderBottom && "border-b-2"
      )}
    >
      <div className="flex gap-2 bg-muted p-2" role="tablist">
        {items.map((item, index) => {
          const tabLabel =
            item.props.title ?? item.props.label ?? `Tab ${index + 1}`;
          return (
            <button
              aria-selected={index === active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border-none bg-transparent px-3 py-2 text-sm cursor-pointer transition-colors",
                index === active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-index={index}
              key={String(item.key ?? tabLabel)}
              onClick={handleTabClick}
              role="tab"
              type="button"
            >
              {item.props.icon ? (
                <span className="shrink-0">{item.props.icon}</span>
              ) : null}
              {tabLabel}
            </button>
          );
        })}
      </div>
      <div className="p-4" role="tabpanel">
        {activeItem}
      </div>
    </div>
  );
};
