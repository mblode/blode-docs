import { normalizePath } from "@repo/common";
import type { DocsNavigation } from "@repo/models";
import type { PageMetadata } from "@repo/previewing";

import type { OpenApiRegistry } from "./openapi";
import { toDocHref } from "./routes";

export interface NavPage {
  type: "page";
  title: string;
  path: string;
  source: "mdx" | "openapi";
  identifier?: string;
  sidebarTitle?: string;
  icon?: string;
  iconType?: string;
  tag?: string;
  hidden?: boolean;
  deprecated?: boolean;
  url?: string;
  hideApiMarker?: boolean;
}

export interface NavGroup {
  type: "group";
  title: string;
  items: NavPage[];
  expanded?: boolean;
  hidden?: boolean;
}

export type NavEntry = NavGroup | NavPage;

export const getNavPageTitle = (page: NavPage): string =>
  page.sidebarTitle ?? page.title;

export const getNavPageHref = (page: NavPage, basePath: string): string =>
  page.url ?? toDocHref(page.path, basePath);

const titleFromSlug = (slug: string) => {
  const clean = slug.replaceAll("-", " ").split("/").pop() ?? slug;
  if (clean === "index") {
    return "Overview";
  }
  return clean.replaceAll(/\b\w/g, (char) => char.toUpperCase());
};

const createPageItem = (
  page: string,
  registry: OpenApiRegistry,
  slugPrefix: string
): NavPage => {
  const entry = registry.byIdentifier.get(page);
  if (entry) {
    return {
      identifier: entry.identifier,
      path: entry.slug,
      source: "openapi",
      title: entry.operation.summary ?? entry.identifier,
      type: "page",
    };
  }

  const normalized = normalizePath(page);
  const path = slugPrefix
    ? normalizePath(`${slugPrefix}/${normalized}`)
    : normalized;

  return {
    path,
    source: "mdx",
    title: titleFromSlug(page),
    type: "page",
  };
};

// oxlint-disable-next-line eslint/complexity
export const buildNavigation = (
  navigation: DocsNavigation | undefined,
  registry: OpenApiRegistry,
  slugPrefix = ""
) => {
  const entries: NavEntry[] = [];
  const groups = navigation?.groups ?? [];
  const hiddenPages = new Set(navigation?.hidden);

  for (const group of groups) {
    const title = group.group ?? "Untitled";
    const items: NavPage[] = [];
    const groupHidden = group.hidden === true;

    if (group.pages?.length) {
      for (const page of group.pages) {
        const item = createPageItem(page, registry, slugPrefix);
        if (groupHidden || hiddenPages.has(page)) {
          item.hidden = true;
        }
        items.push(item);
      }
    } else if (group.openapi) {
      const sourceKey =
        typeof group.openapi === "string"
          ? `${group.openapi}::::`
          : `${group.openapi.source}::${group.openapi.directory ?? ""}::${(
              group.openapi.include ?? []
            ).join("|")}`;
      const sourceEntries = registry.bySource.get(sourceKey) ?? [];
      for (const entry of sourceEntries) {
        items.push({
          hidden: groupHidden || undefined,
          identifier: entry.identifier,
          path: entry.slug,
          source: "openapi",
          title: entry.operation.summary ?? entry.identifier,
          type: "page",
        });
      }
    }

    if (items.length) {
      entries.push({
        expanded: group.expanded,
        hidden: groupHidden || undefined,
        items,
        title,
        type: "group",
      });
    }
  }

  const topPages = navigation?.pages ?? [];
  for (const page of topPages) {
    const item = createPageItem(page, registry, slugPrefix);
    if (hiddenPages.has(page)) {
      item.hidden = true;
    }
    entries.push(item);
  }

  return entries;
};

const enrichPage = (
  page: NavPage,
  metadataMap: Map<string, PageMetadata>
): NavPage => {
  const meta = metadataMap.get(page.path);
  if (!meta) {
    return page;
  }
  return {
    ...page,
    deprecated: meta.deprecated ?? page.deprecated,
    hidden: meta.hidden ?? page.hidden,
    hideApiMarker: meta.hideApiMarker ?? page.hideApiMarker,
    icon: meta.icon ?? page.icon,
    iconType: meta.iconType ?? page.iconType,
    sidebarTitle: meta.sidebarTitle ?? page.sidebarTitle,
    tag: meta.tag ?? page.tag,
    title: meta.title ?? page.title,
    url: meta.url ?? page.url,
  };
};

export const enrichNavWithMetadata = (
  entries: NavEntry[],
  metadataMap: Map<string, PageMetadata>
): NavEntry[] =>
  entries.map((entry) => {
    if (entry.type === "page") {
      return enrichPage(entry, metadataMap);
    }
    return {
      ...entry,
      items: entry.items.map((item) => enrichPage(item, metadataMap)),
    };
  });

export const getVisibleNavigation = (entries: NavEntry[]): NavEntry[] => {
  const visible: NavEntry[] = [];
  for (const entry of entries) {
    if (entry.hidden) {
      continue;
    }
    if (entry.type === "group") {
      const visibleItems = entry.items.filter((item) => !item.hidden);
      if (visibleItems.length) {
        visible.push({ ...entry, items: visibleItems });
      }
    } else {
      visible.push(entry);
    }
  }
  return visible;
};

export const flattenNav = (entries: NavEntry[]): NavPage[] => {
  const pages: NavPage[] = [];
  for (const entry of entries) {
    if (entry.type === "page") {
      pages.push(entry);
    } else {
      pages.push(...entry.items);
    }
  }
  return pages;
};

export interface NavTab {
  label: string;
  icon?: string;
  href?: string;
  entries: NavEntry[];
  slugPrefix?: string;
}

export const buildTabbedNavigation = (
  navigation: DocsNavigation | undefined,
  registry: OpenApiRegistry,
  slugPrefix = ""
): NavTab[] | null => {
  if (!navigation?.tabs?.length) {
    return null;
  }
  const { tabs } = navigation;

  return tabs.map((tab) => {
    if (tab.href) {
      return {
        entries: [],
        href: tab.href,
        icon: tab.icon,
        label: tab.label,
      };
    }

    const tabNav: DocsNavigation = {
      groups: tab.groups,
      hidden: navigation.hidden,
      pages: tab.pages,
    };
    const entries = buildNavigation(tabNav, registry, slugPrefix);
    const [firstPage] = flattenNav(entries);

    return {
      entries,
      icon: tab.icon,
      label: tab.label,
      slugPrefix: firstPage?.path,
    };
  });
};

export const findActiveTabIndex = (
  tabs: NavTab[],
  currentPath: string
): number => {
  const normalized = normalizePath(currentPath);
  for (const [index, tab] of tabs.entries()) {
    if (tab.href) {
      continue;
    }
    const pages = flattenNav(tab.entries);
    if (pages.some((page) => page.path === normalized)) {
      return index;
    }
  }
  return 0;
};

export const findBreadcrumbs = (entries: NavEntry[], path: string) => {
  const normalized = normalizePath(path);
  for (const entry of entries) {
    if (entry.type === "page" && entry.path === normalized) {
      return [{ label: getNavPageTitle(entry), path: entry.path }];
    }
    if (entry.type === "group") {
      const found = entry.items.find((item) => item.path === normalized);
      if (found) {
        return [
          { label: entry.title, path: "" },
          { label: getNavPageTitle(found), path: found.path },
        ];
      }
    }
  }
  return [] as { label: string; path: string }[];
};
