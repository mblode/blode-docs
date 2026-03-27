"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import type { TocItem } from "@/lib/toc";

const useActiveItem = (itemIds: string[]) => {
  const [activeId, setActiveId] = useState<string | null>(itemIds[0] ?? null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "0% 0% -80% 0%" }
    );

    for (const id of itemIds) {
      const element = document.querySelector(`#${id}`);
      if (element) {
        observer.observe(element);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [itemIds]);

  return activeId;
};

export const DocToc = ({
  toc,
  contextualItems,
}: {
  toc: TocItem[];
  contextualItems?: ReactNode;
}) => {
  const itemIds = useMemo(() => toc.map((i) => i.id), [toc]);
  const activeId = useActiveItem(itemIds);

  if (!toc.length && !contextualItems) {
    return null;
  }

  return (
    <nav
      aria-label="Table of contents"
      className="sticky top-[calc(var(--header-height,4rem)+1px)] z-30 ml-auto hidden h-[90svh] w-56 shrink-0 flex-col gap-4 overflow-hidden overscroll-none pb-8 xl:flex"
    >
      <div className="no-scrollbar flex flex-col gap-8 overflow-y-auto px-8">
        <div className="flex flex-col gap-2 p-4 pt-0 text-sm">
          {toc.length > 0 ? (
            <>
              <p className="sticky top-0 h-6 bg-background font-medium text-muted-foreground text-xs">
                On This Page
              </p>
              {toc.map((item) => (
                <a
                  aria-current={item.id === activeId ? "true" : undefined}
                  className="text-[0.8rem] text-muted-foreground no-underline transition-colors hover:text-foreground data-[depth=3]:pl-4 data-[depth=4]:pl-6 data-[active=true]:font-medium data-[active=true]:text-foreground"
                  data-active={item.id === activeId}
                  data-depth={item.level}
                  href={`#${item.id}`}
                  key={item.id}
                >
                  {item.title}
                </a>
              ))}
            </>
          ) : null}
          {contextualItems}
        </div>
      </div>
    </nav>
  );
};
