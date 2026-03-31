"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getNavPageHref, getNavPageTitle } from "@/lib/navigation";
import type { NavEntry, NavPage, NavTab } from "@/lib/navigation";
import { isExternalHref, resolveHref, toDocHref } from "@/lib/routes";
import { cn } from "@/lib/utils";

const MobileLink = ({
  href,
  onOpenChange,
  className,
  children,
  onClick,
  ...props
}: React.ComponentProps<typeof Link> & {
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}) => {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      onOpenChange?.(false);
    },
    [onClick, onOpenChange]
  );

  return (
    <Link
      className={cn("flex items-center gap-2 text-2xl font-medium", className)}
      href={href}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
};

export const MobileNav = ({
  entries,
  globalLinks,
  basePath,
  tabs,
  activeTabIndex,
  className,
}: {
  entries: NavEntry[];
  globalLinks: { label: string; href: string }[];
  basePath: string;
  tabs?: NavTab[] | null;
  activeTabIndex?: number;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);

  const renderPageLink = (page: NavPage) => {
    const href = getNavPageHref(page, basePath);
    const isExternal = Boolean(page.url && isExternalHref(page.url));

    return (
      <MobileLink
        href={href}
        key={page.path}
        onOpenChange={setOpen}
        rel={isExternal ? "noopener noreferrer" : undefined}
        target={isExternal ? "_blank" : undefined}
      >
        {getNavPageTitle(page)}
      </MobileLink>
    );
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "extend-touch-target !p-0 h-8 touch-manipulation items-center justify-start gap-2.5 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent dark:hover:bg-transparent",
            className
          )}
          variant="ghost"
        >
          <div className="relative flex h-8 w-4 items-center justify-center">
            <div className="relative size-4">
              <span
                className={cn(
                  "absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100",
                  open ? "top-[0.4rem] -rotate-45" : "top-1"
                )}
              />
              <span
                className={cn(
                  "absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100",
                  open ? "top-[0.4rem] rotate-45" : "top-2.5"
                )}
              />
            </div>
            <span className="sr-only">Toggle Menu</span>
          </div>
          <span className="flex h-8 items-center text-lg font-medium leading-none">
            Menu
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        alignOffset={-16}
        className="no-scrollbar h-(--available-height) w-(--available-width) overflow-y-auto rounded-none border-none bg-background/90 p-0 shadow-none backdrop-blur duration-100 data-open:animate-none!"
        side="bottom"
        sideOffset={14}
      >
        <div className="flex flex-col gap-12 overflow-auto px-6 py-6">
          {tabs?.length ? (
            <div className="flex flex-col gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                Sections
              </div>
              <div className="flex flex-col gap-3">
                {tabs.map((tab, index) => {
                  const href =
                    (tab.href ? resolveHref(tab.href, basePath) : undefined) ??
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
                      onOpenChange={setOpen}
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
                    onOpenChange={setOpen}
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
      </PopoverContent>
    </Popover>
  );
};
