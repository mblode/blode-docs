"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

let savedScrollTop = 0;

export const SidebarScrollArea = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    if (savedScrollTop > 0) {
      el.scrollTop = savedScrollTop;
    } else {
      const active = el.querySelector<HTMLElement>("[data-active]");
      if (active) {
        active.scrollIntoView({ behavior: "instant", block: "center" });
      }
    }
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        savedScrollTop = el.scrollTop;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={scrollRef} className={className}>
      {children}
    </div>
  );
};
