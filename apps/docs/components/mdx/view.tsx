"use client";

import { isValidElement, useCallback, useMemo, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ViewItemProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export const View = ({ children }: ViewItemProps) => children as ReactElement;

interface ViewGroupProps {
  children: ReactNode;
}

export const ViewGroup = ({ children }: ViewGroupProps) => {
  const items = useMemo(() => {
    const nodes = Array.isArray(children) ? children : [children];
    return nodes.filter(
      (child): child is ReactElement<ViewItemProps> =>
        isValidElement<ViewItemProps>(child) && child.type === View
    );
  }, [children]);

  const [active, setActive] = useState(0);

  const handleSelect = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const index = Number(event.currentTarget.dataset.index ?? "0");
    setActive(index);
  }, []);

  if (!items.length) {
    return children as ReactElement;
  }

  return (
    <div className="my-4">
      <div className="mb-4 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <button
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              index === active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
            data-index={index}
            key={item.props.title}
            onClick={handleSelect}
            type="button"
          >
            {item.props.icon ? (
              <span className="shrink-0">{item.props.icon}</span>
            ) : null}
            {item.props.title}
          </button>
        ))}
      </div>
      <div>{items[active]}</div>
    </div>
  );
};
