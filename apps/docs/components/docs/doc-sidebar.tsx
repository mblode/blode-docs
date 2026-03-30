import { normalizePath } from "@repo/common";
import { ArrowUpRightIcon } from "blode-icons-react";
import Image from "next/image";
import Link from "next/link";

import { getNavPageHref, getNavPageTitle } from "@/lib/navigation";
import type { NavEntry, NavPage } from "@/lib/navigation";
import { toDocHref } from "@/lib/routes";
import { cn } from "@/lib/utils";

const MENU_BUTTON_CLASS =
  "relative flex min-h-[30px] items-center gap-2 overflow-visible rounded-md border border-transparent px-2 text-[0.8rem] font-medium transition-colors hover:bg-accent/70 hover:text-foreground";

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

  const className = cn(
    MENU_BUTTON_CLASS,
    isActive && "border-accent bg-accent text-foreground"
  );

  if (item.url) {
    return (
      <a
        className={className}
        href={item.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {linkContent}
      </a>
    );
  }

  return (
    <Link
      className={className}
      href={getNavPageHref(item, basePath)}
      prefetch={false}
    >
      {linkContent}
    </Link>
  );
};

const Section = ({
  title,
  children,
  paddedTop = false,
}: {
  title?: string;
  children: React.ReactNode;
  paddedTop?: boolean;
}) => (
  <section
    className={cn(
      "relative flex w-full min-w-0 flex-col p-2",
      paddedTop && "pt-6"
    )}
  >
    {title ? (
      <div className="mb-2 px-2 font-medium text-muted-foreground text-xs">
        {title}
      </div>
    ) : null}
    <div className="w-full text-sm">{children}</div>
  </section>
);

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
  const activePath = normalizePath(currentPath);
  const isActive = (path: string) => normalizePath(path) === activePath;

  return (
    <aside
      className="sticky top-[calc(var(--header-height)+0.6rem)] z-30 hidden h-[calc(100svh-10rem)] w-[calc(var(--spacing)*56)] shrink-0 overscroll-none bg-transparent lg:flex"
      aria-label="Documentation navigation"
    >
      <div className="h-9" />
      <div className="absolute top-8 z-10 h-8 w-full shrink-0 bg-gradient-to-b from-background via-background/80 to-background/50 blur-xs" />
      <div className="absolute top-12 right-2 bottom-0 hidden h-full w-px bg-gradient-to-b from-transparent via-border to-transparent lg:flex" />
      <div className="no-scrollbar mx-auto flex w-full flex-1 flex-col overflow-x-hidden px-2">
        {anchors?.length ? (
          <Section paddedTop title="Pinned">
            <ul className="space-y-1">
              {anchors.map((anchor) => (
                <li key={anchor.href}>
                  <a
                    className={cn(MENU_BUTTON_CLASS, "text-foreground")}
                    href={
                      anchor.href.startsWith("http")
                        ? anchor.href
                        : toDocHref(anchor.href, basePath)
                    }
                  >
                    {anchor.label}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
        {entries.map((entry, index) => {
          if (entry.type === "page") {
            return (
              <Section
                key={entry.path}
                paddedTop={index === 0 && !anchors?.length}
              >
                <ul>
                  <li>
                    <NavPageLink
                      basePath={basePath}
                      isActive={isActive(entry.path)}
                      item={entry}
                    />
                  </li>
                </ul>
              </Section>
            );
          }

          return (
            <Section
              key={entry.title}
              paddedTop={index === 0 && !anchors?.length}
              title={entry.title}
            >
              <ul className="space-y-0.5">
                {entry.items.map((item) => (
                  <li key={item.path}>
                    <NavPageLink
                      basePath={basePath}
                      isActive={isActive(item.path)}
                      item={item}
                    />
                  </li>
                ))}
              </ul>
            </Section>
          );
        })}
        <div className="sticky -bottom-1 z-10 h-16 shrink-0 bg-gradient-to-t from-background via-background/80 to-background/50 blur-xs" />
      </div>
    </aside>
  );
};
