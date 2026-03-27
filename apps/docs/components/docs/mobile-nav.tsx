"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { NavEntry } from "@/lib/navigation";
import { toDocHref } from "@/lib/routes";
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
}: {
  entries: NavEntry[];
  globalLinks: { label: string; href: string }[];
  basePath: string;
}) => {
  const [open, setOpen] = useState(false);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-label="Toggle menu"
          className="inline-flex size-8 items-center justify-center gap-2.5 rounded-md hover:bg-accent lg:hidden"
          type="button"
        >
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
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        alignOffset={-16}
        className="no-scrollbar h-(--available-height) w-(--available-width) overflow-y-auto rounded-none border-none bg-background/90 p-0 shadow-none backdrop-blur duration-100 data-open:animate-none!"
        side="bottom"
        sideOffset={14}
      >
        <div className="flex flex-col gap-12 overflow-auto px-6 py-6">
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
              return (
                <MobileLink
                  href={toDocHref(entry.path, basePath)}
                  key={entry.path}
                  onClose={handleClose}
                >
                  {entry.title}
                </MobileLink>
              );
            }
            return (
              <div className="flex flex-col gap-4" key={entry.title}>
                <div className="text-sm font-medium text-muted-foreground">
                  {entry.title}
                </div>
                <div className="flex flex-col gap-3">
                  {entry.items.map((item) => (
                    <MobileLink
                      className="flex items-center gap-2"
                      href={toDocHref(item.path, basePath)}
                      key={item.path}
                      onClose={handleClose}
                    >
                      {item.title}
                    </MobileLink>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
