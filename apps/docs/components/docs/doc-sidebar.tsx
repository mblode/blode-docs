"use client";

import { normalizePath } from "@repo/common";
import { ArrowUpRightIcon } from "blode-icons-react";
import Image from "next/image";
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
import { getNavPageHref, getNavPageTitle } from "@/lib/navigation";
import type { NavEntry, NavPage } from "@/lib/navigation";
import { toDocHref } from "@/lib/routes";

const MENU_BUTTON_CLASS =
  "data-[active=true]:bg-accent data-[active=true]:border-accent 3xl:fixed:w-full 3xl:fixed:max-w-48 relative h-[30px] w-fit overflow-visible border border-transparent text-[0.8rem] font-medium after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md";

const NavIcon = ({ icon }: { icon: string }) => {
  if (icon.startsWith("http") || icon.startsWith("/")) {
    return (
      <Image
        alt=""
        className="size-4 shrink-0"
        height={16}
        src={icon}
        unoptimized
        width={16}
      />
    );
  }
  return (
    <span className="size-4 shrink-0 text-center text-[10px] leading-4 text-muted-foreground">
      {icon.slice(0, 2)}
    </span>
  );
};

const NavPageLink = ({
  item,
  basePath,
  isActive,
}: {
  item: NavPage;
  basePath: string;
  isActive: boolean;
}) => {
  const displayTitle = getNavPageTitle(item);

  const linkContent = (
    <>
      <span className="absolute inset-0 flex w-(--sidebar-menu-width) bg-transparent" />
      {item.icon ? <NavIcon icon={item.icon} /> : null}
      <span className={item.deprecated ? "line-through opacity-60" : undefined}>
        {displayTitle}
      </span>
      {item.tag ? (
        <span className="ml-auto shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary">
          {item.tag}
        </span>
      ) : null}
      {item.deprecated && !item.tag ? (
        <span className="ml-auto shrink-0 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium leading-none text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
          Deprecated
        </span>
      ) : null}
      {item.url ? (
        <ArrowUpRightIcon
          aria-hidden="true"
          className="ml-auto size-3 shrink-0 text-muted-foreground"
        />
      ) : null}
    </>
  );

  if (item.url) {
    return (
      <SidebarMenuButton asChild className={MENU_BUTTON_CLASS}>
        <a href={item.url} rel="noopener noreferrer" target="_blank">
          {linkContent}
        </a>
      </SidebarMenuButton>
    );
  }

  return (
    <SidebarMenuButton
      asChild
      className={MENU_BUTTON_CLASS}
      isActive={isActive}
    >
      <Link href={getNavPageHref(item, basePath)} prefetch={false}>
        {linkContent}
      </Link>
    </SidebarMenuButton>
  );
};

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
  const currentPathname = normalizePath(pathname);

  const isActive = (path: string) => {
    const normalized = normalizePath(path);
    return normalized === activePath || normalized === currentPathname;
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
                        <span className="absolute inset-0 flex w-(--sidebar-menu-width) bg-transparent" />
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
                      <NavPageLink
                        basePath={basePath}
                        isActive={isActive(entry.path)}
                        item={entry}
                      />
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
              <SidebarGroupContent className="content-auto">
                <SidebarMenu className="gap-0.5">
                  {entry.items.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <NavPageLink
                        basePath={basePath}
                        isActive={isActive(item.path)}
                        item={item}
                      />
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
