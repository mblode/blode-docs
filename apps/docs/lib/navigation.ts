import { normalizePath } from "@repo/common";
import type { DocsConfig } from "@repo/models";
import type { OpenApiRegistry } from "./openapi";

export interface NavPage {
  type: "page";
  title: string;
  path: string;
  source: "mdx" | "openapi";
  identifier?: string;
}

export interface NavGroup {
  type: "group";
  title: string;
  items: NavPage[];
  expanded?: boolean;
}

export type NavEntry = NavGroup | NavPage;

const titleFromSlug = (slug: string) => {
  const clean = slug.replace(/-/g, " ").split("/").pop() ?? slug;
  if (clean === "index") {
    return "Overview";
  }
  return clean.replace(/\b\w/g, (char) => char.toUpperCase());
};

const createPageItem = (page: string, registry: OpenApiRegistry): NavPage => {
  const entry = registry.byIdentifier.get(page);
  if (entry) {
    return {
      type: "page",
      title: entry.operation.summary ?? entry.identifier,
      path: entry.slug,
      source: "openapi",
      identifier: entry.identifier,
    };
  }

  return {
    type: "page",
    title: titleFromSlug(page),
    path: normalizePath(page),
    source: "mdx",
  };
};

export const buildNavigation = (
  config: DocsConfig,
  registry: OpenApiRegistry
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO: Refactor by extracting group and page processing into separate functions
) => {
  const entries: NavEntry[] = [];
  const groups = config.navigation.groups ?? [];

  for (const group of groups) {
    const title = group.group ?? "Untitled";
    const items: NavPage[] = [];

    if (group.pages?.length) {
      for (const page of group.pages) {
        items.push(createPageItem(page, registry));
      }
    } else if (group.openapi) {
      const sourceKey =
        typeof group.openapi === "string"
          ? `${group.openapi}::`
          : `${group.openapi.source}::${group.openapi.directory ?? ""}`;
      const sourceEntries = registry.bySource.get(sourceKey) ?? [];
      for (const entry of sourceEntries) {
        items.push({
          type: "page",
          title: entry.operation.summary ?? entry.identifier,
          path: entry.slug,
          source: "openapi",
          identifier: entry.identifier,
        });
      }
    }

    if (items.length) {
      entries.push({ type: "group", title, items, expanded: group.expanded });
    }
  }

  const topPages = config.navigation.pages ?? [];
  for (const page of topPages) {
    entries.push(createPageItem(page, registry));
  }

  return entries;
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

export const findBreadcrumbs = (entries: NavEntry[], path: string) => {
  const normalized = normalizePath(path);
  for (const entry of entries) {
    if (entry.type === "page" && entry.path === normalized) {
      return [{ label: entry.title, path: entry.path }];
    }
    if (entry.type === "group") {
      const found = entry.items.find((item) => item.path === normalized);
      if (found) {
        return [
          { label: entry.title, path: "" },
          { label: found.title, path: found.path },
        ];
      }
    }
  }
  return [] as Array<{ label: string; path: string }>;
};
