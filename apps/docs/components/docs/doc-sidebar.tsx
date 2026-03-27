"use client";

import { normalizePath } from "@repo/common";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { NavEntry } from "@/lib/navigation";
import { toDocHref } from "@/lib/routes";

const MENU_BUTTON_CLASS =
  "data-[active=true]:bg-accent data-[active=true]:border-accent relative h-[30px] w-fit overflow-visible border border-transparent text-[0.8rem] font-medium after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md";

export const DocSidebar = ({
  entries,
  currentPath,
  anchors,
  basePath,
}: {
  entries: NavEntry[];
  currentPath: string;
  anchors?: { label: string; href: string }[];
  basePath: string;
}) => {
  const pathname = usePathname();
  const activePath = normalizePath(currentPath);

  const isActive = (path: string) => {
    const normalized = normalizePath(path);
    const current = normalizePath(pathname);
    return normalized === activePath || normalized === current;
  };

  return (
    <Sidebar
      className="sticky top-[calc(var(--header-height)+0.6rem)] z-30 hidden h-[calc(100svh-10rem)] overscroll-none bg-transparent [--sidebar-menu-width:--spacing(56)] lg:flex"
      collapsible="none"
    >
      <div className="h-9" />
      <div className="absolute top-8 z-10 h-8 w-(--sidebar-menu-width) shrink-0 bg-gradient-to-b from-background via-background/80 to-background/50 blur-xs" />
      <div className="absolute top-12 right-2 bottom-0 hidden h-full w-px bg-gradient-to-b from-transparent via-border to-transparent lg:flex" />
      <SidebarContent className="no-scrollbar mx-auto w-(--sidebar-menu-width) overflow-x-hidden px-2">
        {anchors?.length ? (
          <SidebarGroup className="pt-6">
            <SidebarGroupLabel className="font-medium text-muted-foreground">
              Pinned
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {anchors.map((anchor) => (
                  <SidebarMenuItem key={anchor.href}>
                    <SidebarMenuButton asChild className={MENU_BUTTON_CLASS}>
                      <a
                        href={
                          anchor.href.startsWith("http")
                            ? anchor.href
                            : toDocHref(anchor.href, basePath)
                        }
                      >
                        {anchor.label}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
        {entries.map((entry, index) => {
          if (entry.type === "page") {
            return (
              <SidebarGroup
                className={index === 0 && !anchors?.length ? "pt-6" : undefined}
                key={entry.path}
              >
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className={MENU_BUTTON_CLASS}
                        isActive={isActive(entry.path)}
                      >
                        <Link href={toDocHref(entry.path, basePath)}>
                          {entry.title}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <SidebarGroup
              className={index === 0 && !anchors?.length ? "pt-6" : undefined}
              key={entry.title}
            >
              <SidebarGroupLabel className="font-medium text-muted-foreground">
                {entry.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {entry.items.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        className={MENU_BUTTON_CLASS}
                        isActive={isActive(item.path)}
                      >
                        <Link href={toDocHref(item.path, basePath)}>
                          {item.title}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
        <div className="sticky -bottom-1 z-10 h-16 shrink-0 bg-gradient-to-t from-background via-background/80 to-background/50 blur-xs" />
      </SidebarContent>
    </Sidebar>
  );
};
