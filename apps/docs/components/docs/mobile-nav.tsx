"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { getNavPageHref, getNavPageTitle } from "@/lib/navigation";
import type { NavEntry, NavPage, NavTab } from "@/lib/navigation";
import { isExternalHref, resolveHref, toDocHref } from "@/lib/routes";
import { cn } from "@/lib/utils";

const MobileLink = ({
  href,
  onClose,
  className,
  children,
  ...props
}: {
  href: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "onClick">) => (
  <Link
    className={cn("flex items-center gap-2 text-2xl font-medium", className)}
    href={href}
    onClick={onClose}
    {...props}
  >
    {children}
  </Link>
);

export const MobileNav = ({
  entries,
  globalLinks,
  basePath,
  tabs,
  activeTabIndex,
}: {
  entries: NavEntry[];
  globalLinks: { label: string; href: string }[];
  basePath: string;
  tabs?: NavTab[] | null;
  activeTabIndex?: number;
}) => {
  const [open, setOpen] = useState(false);
  const handleClose = useCallback(() => setOpen(false), []);
  const handleOpen = useCallback(() => setOpen(true), []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [open]);

  const renderPageLink = (page: NavPage) => {
    const href = getNavPageHref(page, basePath);
    const isExternal = Boolean(page.url && isExternalHref(page.url));

    return (
      <MobileLink
        href={href}
        key={page.path}
        onClose={handleClose}
        rel={isExternal ? "noopener noreferrer" : undefined}
        target={isExternal ? "_blank" : undefined}
      >
        {getNavPageTitle(page)}
      </MobileLink>
    );
  };

  return (
    <>
      <button
        aria-label="Toggle menu"
        className="inline-flex size-8 items-center justify-center gap-2.5 rounded-md hover:bg-accent lg:hidden"
        onClick={handleOpen}
        type="button"
      >
        <div className="relative size-4">
          <span className="absolute left-0 top-1 block h-0.5 w-4 bg-foreground" />
          <span className="absolute left-0 top-2.5 block h-0.5 w-4 bg-foreground" />
        </div>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-background/90 backdrop-blur-sm"
            onClick={handleClose}
            type="button"
          />
          <div className="relative flex h-full flex-col overflow-y-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Navigation
              </span>
              <button
                aria-label="Close menu"
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={handleClose}
                type="button"
              >
                X
              </button>
            </div>
            <div className="mt-8 flex flex-col gap-12">
              {tabs?.length ? (
                <div className="flex flex-col gap-4">
                  <div className="text-sm font-medium text-muted-foreground">
                    Sections
                  </div>
                  <div className="flex flex-col gap-3">
                    {tabs.map((tab, index) => {
                      const href =
                        (tab.href
                          ? resolveHref(tab.href, basePath)
                          : undefined) ??
                        (tab.slugPrefix
                          ? toDocHref(tab.slugPrefix, basePath)
                          : undefined);
                      if (!href) {
                        return null;
                      }
                      const isActive = index === activeTabIndex;

                      return (
                        <MobileLink
                          className={isActive ? "text-primary" : ""}
                          href={href}
                          key={tab.label}
                          onClose={handleClose}
                          rel={
                            tab.href && isExternalHref(tab.href)
                              ? "noopener noreferrer"
                              : undefined
                          }
                          target={
                            tab.href && isExternalHref(tab.href)
                              ? "_blank"
                              : undefined
                          }
                        >
                          {tab.label}
                        </MobileLink>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {globalLinks.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <div className="text-sm font-medium text-muted-foreground">
                    Menu
                  </div>
                  <div className="flex flex-col gap-3">
                    {globalLinks.map((link) => (
                      <MobileLink
                        href={link.href}
                        key={link.label}
                        onClose={handleClose}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {link.label}
                      </MobileLink>
                    ))}
                  </div>
                </div>
              ) : null}
              {entries.map((entry) => {
                if (entry.type === "page") {
                  return renderPageLink(entry);
                }

                return (
                  <div className="flex flex-col gap-4" key={entry.title}>
                    <div className="text-sm font-medium text-muted-foreground">
                      {entry.title}
                    </div>
                    <div className="flex flex-col gap-3">
                      {entry.items.map((item) => renderPageLink(item))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
