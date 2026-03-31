"use client";

import { isValidElement, useCallback, useId, useMemo, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TabProps {
  title?: string;
  label?: string;
  icon?: ReactNode;
  id?: string;
  children: ReactNode;
}

interface ResolvedTabItem {
  element: ReactElement<TabProps>;
  key: string;
  label: string;
}

interface TabsProps {
  children: ReactNode;
  defaultTabIndex?: number;
  borderBottom?: boolean;
}

export const Tab = ({ children }: TabProps) => (
  <div className="p-4">{children}</div>
);

const clampTabIndex = (index: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), total - 1);
};

const sanitizeDomId = (value: string) =>
  value.replaceAll(/[^a-zA-Z0-9_-]/g, "-");

const toNodeArray = (children: ReactNode): ReactNode[] =>
  Array.isArray(children) ? children.flatMap(toNodeArray) : [children];

const resolveTabItems = (children: ReactNode): ResolvedTabItem[] =>
  toNodeArray(children)
    .filter((child): child is ReactElement<TabProps> =>
      isValidElement<TabProps>(child)
    )
    .map((element, index) => {
      const label =
        element.props.title ?? element.props.label ?? `Tab ${index + 1}`;
      const key = sanitizeDomId(
        String(element.props.id ?? element.key ?? `tab-${index + 1}`)
      );

      return {
        element,
        key,
        label,
      };
    });

export const Tabs = ({
  children,
  defaultTabIndex = 0,
  borderBottom,
}: TabsProps) => {
  const items = useMemo(() => resolveTabItems(children), [children]);
  const [active, setActive] = useState<number | null>(null);
  const activeIndex = clampTabIndex(active ?? defaultTabIndex, items.length);
  const activeItem = items[activeIndex];
  const tabsId = useId();

  const getTabId = useCallback(
    (index: number) => `${tabsId}-${items[index]?.key ?? index}-tab`,
    [items, tabsId]
  );
  const getPanelId = useCallback(
    (index: number) => `${tabsId}-${items[index]?.key ?? index}-panel`,
    [items, tabsId]
  );
  const focusTab = useCallback(
    (index: number) => {
      document.querySelector<HTMLElement>(`[id="${getTabId(index)}"]`)?.focus();
    },
    [getTabId]
  );

  const handleTabClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const index = Number(event.currentTarget.dataset.index ?? "0");
    setActive(index);
  }, []);

  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (!items.length) {
        return;
      }

      const index = Number(event.currentTarget.dataset.index ?? activeIndex);
      const lastIndex = items.length - 1;
      let nextIndex: number | null = null;

      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight": {
          nextIndex = index === lastIndex ? 0 : index + 1;
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          nextIndex = index === 0 ? lastIndex : index - 1;
          break;
        }
        case "End": {
          nextIndex = lastIndex;
          break;
        }
        case "Home": {
          nextIndex = 0;
          break;
        }
        default: {
          return;
        }
      }

      event.preventDefault();
      setActive(nextIndex);
      focusTab(nextIndex);
    },
    [activeIndex, focusTab, items.length]
  );

  if (!activeItem) {
    return null;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface",
        borderBottom && "border-b-2"
      )}
    >
      <div
        aria-orientation="horizontal"
        className="flex gap-2 bg-muted p-2"
        role="tablist"
      >
        {items.map((item, index) => {
          const isSelected = index === activeIndex;

          return (
            <button
              aria-controls={getPanelId(index)}
              aria-selected={isSelected}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-transparent px-3 py-2 text-sm transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-index={index}
              id={getTabId(index)}
              key={item.key}
              onClick={handleTabClick}
              onKeyDown={handleTabKeyDown}
              role="tab"
              tabIndex={isSelected ? 0 : -1}
              type="button"
            >
              {item.element.props.icon ? (
                <span className="shrink-0">{item.element.props.icon}</span>
              ) : null}
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        aria-labelledby={getTabId(activeIndex)}
        id={getPanelId(activeIndex)}
        role="tabpanel"
        tabIndex={0}
      >
        {activeItem.element}
      </div>
    </div>
  );
};
