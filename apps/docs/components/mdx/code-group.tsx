"use client";

import { isValidElement, useCallback, useId, useMemo, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CodeGroupProps {
  children: ReactNode;
}

interface CodeGroupItemProps {
  "data-rehype-pretty-code-title"?: string;
  children?: ReactNode;
}

interface ResolvedCodeItem {
  element: ReactElement<CodeGroupItemProps>;
  key: string;
  label: string;
}

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

const getCodeLabel = (
  element: ReactElement<CodeGroupItemProps>,
  index: number
) => {
  const title = element.props["data-rehype-pretty-code-title"];
  if (title) {
    return title;
  }

  const pre = toNodeArray(element.props.children).find(
    (child) => isValidElement(child) && child.type === "pre"
  );
  if (isValidElement<{ className?: string }>(pre)) {
    const languageClass = pre.props.className
      ?.split(" ")
      .find((className: string) => className.startsWith("language-"));
    if (languageClass) {
      return languageClass.replace("language-", "");
    }
  }

  return `Tab ${index + 1}`;
};

const resolveCodeItems = (children: ReactNode): ResolvedCodeItem[] =>
  toNodeArray(children)
    .filter((child): child is ReactElement<CodeGroupItemProps> =>
      isValidElement<CodeGroupItemProps>(child)
    )
    .map((element, index) => {
      const label = getCodeLabel(element, index);
      const key = sanitizeDomId(
        String(
          element.key ??
            element.props["data-rehype-pretty-code-title"] ??
            `code-${index + 1}`
        )
      );

      return {
        element,
        key,
        label,
      };
    });

export const CodeGroup = ({ children }: CodeGroupProps) => {
  const items = useMemo(() => resolveCodeItems(children), [children]);
  const [active, setActive] = useState(0);
  const activeIndex = clampTabIndex(active, items.length);
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
    return children as ReactElement;
  }

  if (items.length === 1) {
    return activeItem.element;
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border bg-code">
      <div
        aria-orientation="horizontal"
        className="flex gap-1 border-b border-border bg-muted/50 px-2 pt-2"
        role="tablist"
      >
        {items.map((item, index) => {
          const isSelected = index === activeIndex;

          return (
            <button
              aria-controls={getPanelId(index)}
              aria-selected={isSelected}
              className={cn(
                "rounded-t-md border-b-2 px-3 py-1.5 font-mono text-xs transition-colors",
                isSelected
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
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
