"use client";

import clsx from "clsx";
import { Children, isValidElement, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

interface TabProps {
  label: string;
  children: ReactNode;
}

export const Tab = ({ children }: TabProps) => (
  <div className="tabs__panel">{children}</div>
);

export const Tabs = ({ children }: { children: ReactNode }) => {
  const items = useMemo(
    () =>
      Children.toArray(children).filter(
        isValidElement
      ) as ReactElement<TabProps>[],
    [children]
  );

  const [active, setActive] = useState(0);
  const activeItem = items[active];

  if (!items.length) {
    return null;
  }

  return (
    <div className="tabs">
      <div className="tabs__list" role="tablist">
        {items.map((item, index) => (
          <button
            className={clsx("tabs__trigger", {
              "tabs__trigger--active": index === active,
            })}
            key={`${item.props.label}-${index}`}
            onClick={() => setActive(index)}
            role="tab"
            type="button"
          >
            {item.props.label}
          </button>
        ))}
      </div>
      <div className="tabs__content" role="tabpanel">
        {activeItem}
      </div>
    </div>
  );
};
