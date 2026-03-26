import path from "node:path";

import { normalizePath } from "@repo/common";
import type {
  CollectionConfig,
  ContentType,
  FrontmatterByType,
  LegacyDocsConfig,
  SiteConfig,
} from "@repo/models";
import {
  validateFrontmatter,
  validateLegacyDocsConfig,
  validateSiteConfig,
} from "@repo/validation";
import YAML from "yaml";

import type { ContentSource } from "./content-source.js";

export { BlobContentSource, createBlobSource } from "./blob-source.js";
export { createFsSource, FsContentSource } from "./fs-source.js";
export type { ContentSource } from "./content-source.js";

export type SiteConfigResult =
  | { ok: true; config: SiteConfig; warnings: string[] }
  | { ok: false; errors: string[] };

export type ContentEntry =
  | {
      kind: "entry";
      slug: string;
      title: string;
      description?: string;
      type: ContentType;
      collectionId: string;
      sourcePath: string;
      relativePath: string;
      frontmatter: FrontmatterByType[ContentType];
    }
  | {
      kind: "index";
      slug: string;
      title: string;
      description?: string;
      type: ContentType;
      collectionId: string;
    };

export interface ContentIndex {
  entries: ContentEntry[];
  bySlug: Map<string, ContentEntry>;
  byCollection: Map<string, ContentEntry[]>;
  errors: string[];
}

const BLODE_CONFIG_FILE = "blode-docs.json";
const SITE_CONFIG_FILE = "site.json";
const ALT_CONFIG_FILE = "config.json";
const LEGACY_CONFIG_FILE = "docs.json";
const DOC_FILE_EXTENSION_REGEX = /\.(mdx|md)$/;
const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
const INDEX_SUFFIX = "/index";

const titleFromSlug = (slug: string) => {
  const clean = slug.replaceAll("-", " ").split("/").pop() ?? slug;
  if (clean === "index") {
    return "Overview";
  }
  return clean.replaceAll(/\b\w/g, (char) => char.toUpperCase());
};

const parseFrontmatter = (source: string) => {
  const match = FRONTMATTER_REGEX.exec(source);
  if (!match) {
    return { body: source, frontmatter: {} };
  }
  const raw = match[1] ?? "";
  const data = YAML.parse(raw) ?? {};
  const body = source.slice(match[0].length);
  return { body, frontmatter: data };
};

const slugFromFile = (relativePath: string) => {
  const clean = normalizePath(relativePath);
  const withoutExt = clean.replace(DOC_FILE_EXTENSION_REGEX, "");
  if (withoutExt.endsWith(INDEX_SUFFIX)) {
    const trimmed = withoutExt.slice(0, -INDEX_SUFFIX.length);
    return trimmed.length ? trimmed : "index";
  }
  return withoutExt.length ? withoutExt : "index";
};

const mapLegacyDocsConfig = (legacy: LegacyDocsConfig): SiteConfig => ({
  collections: [
    {
      id: "docs",
      navigation: legacy.navigation,
      openapi: legacy.openapi,
      root: "",
      type: "docs",
    },
  ],
  colors: legacy.colors,
  description: legacy.description,
  favicon: legacy.favicon,
  features: legacy.features,
  fonts: legacy.fonts,
  logo: legacy.logo,
  metadata: legacy.metadata,
  name: legacy.name,
  navigation: legacy.navigation,
  openapiProxy: legacy.openapiProxy,
  scripts: legacy.scripts,
  theme: legacy.theme,
});

const readJsonConfig = async (source: ContentSource, relativePath: string) =>
  JSON.parse(await source.readFile(relativePath)) as unknown;

const loadCurrentConfig = async (
  source: ContentSource,
  relativePath: string
): Promise<SiteConfigResult | null> => {
  if (!(await source.exists(relativePath))) {
    return null;
  }

  try {
    const parsed = await readJsonConfig(source, relativePath);
    const result = validateSiteConfig(parsed);
    if (!result.success) {
      return { errors: result.errors, ok: false };
    }
    return { config: result.data, ok: true, warnings: [] };
  } catch (error) {
    return {
      errors: [
        error instanceof Error
          ? error.message
          : `Failed to load ${relativePath}`,
      ],
      ok: false,
    };
  }
};

const loadLegacyConfig = async (
  source: ContentSource
): Promise<SiteConfigResult | null> => {
  if (!(await source.exists(LEGACY_CONFIG_FILE))) {
    return null;
  }

  try {
    const parsed = await readJsonConfig(source, LEGACY_CONFIG_FILE);
    const result = validateLegacyDocsConfig(parsed);
    if (!result.success) {
      return { errors: result.errors, ok: false };
    }
    return {
      config: mapLegacyDocsConfig(result.data),
      ok: true,
      warnings: ["docs.json is deprecated. Rename it to site.json."],
    };
  } catch (error) {
    return {
      errors: [
        error instanceof Error
          ? error.message
          : `Failed to load ${LEGACY_CONFIG_FILE}`,
      ],
      ok: false,
    };
  }
};

export const loadSiteConfig = async (
  source: ContentSource
): Promise<SiteConfigResult> => {
  const currentConfig =
    (await loadCurrentConfig(source, BLODE_CONFIG_FILE)) ??
    (await loadCurrentConfig(source, SITE_CONFIG_FILE)) ??
    (await loadCurrentConfig(source, ALT_CONFIG_FILE));

  if (currentConfig) {
    return currentConfig;
  }

  const legacyConfig = await loadLegacyConfig(source);
  if (legacyConfig) {
    return legacyConfig;
  }

  return {
    errors: [
      "blode-docs.json, site.json, config.json, or docs.json not found.",
    ],
    ok: false,
  };
};

export const loadContentSource = async (
  source: ContentSource,
  relativePath: string
) => await source.readFile(relativePath);

const listContentFiles = async (source: ContentSource, directory: string) => {
  const files = await source.listFiles(directory);
  return files.filter((file: string) => DOC_FILE_EXTENSION_REGEX.test(file));
};

const sortDefaults: Record<
  ContentType,
  { field: "date" | "order" | "title" | "price"; direction: "asc" | "desc" }
> = {
  blog: { direction: "desc", field: "date" },
  courses: { direction: "asc", field: "order" },
  docs: { direction: "asc", field: "title" },
  forms: { direction: "asc", field: "title" },
  notes: { direction: "desc", field: "date" },
  products: { direction: "asc", field: "title" },
  sheets: { direction: "asc", field: "title" },
  site: { direction: "asc", field: "title" },
  slides: { direction: "asc", field: "title" },
  todos: { direction: "desc", field: "date" },
};

const normalizeSortValue = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
    return value.toLowerCase();
  }
  return null;
};

const compareValues = (a: unknown, b: unknown, direction: "asc" | "desc") => {
  const left = normalizeSortValue(a);
  const right = normalizeSortValue(b);
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  const multiplier = direction === "desc" ? -1 : 1;
  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * multiplier;
  }
  if (left < right) {
    return -1 * multiplier;
  }
  if (left > right) {
    return 1 * multiplier;
  }
  return 0;
};

const autoIndexTypes = new Set<ContentType>([
  "blog",
  "courses",
  "products",
  "notes",
  "forms",
  "sheets",
  "slides",
  "todos",
]);

const getCollectionIndex = (
  collection: CollectionConfig,
  slugPrefix: string
) => {
  if (collection.index) {
    return collection.index;
  }
  if (autoIndexTypes.has(collection.type)) {
    const slug = slugPrefix || collection.id;
    return {
      slug,
      title: titleFromSlug(slug),
    };
  }
  return null;
};

const addEntry = (
  entry: ContentEntry,
  index: ContentIndex,
  errors: string[]
) => {
  if (index.bySlug.has(entry.slug)) {
    errors.push(`slug "${entry.slug}" is defined more than once`);
    return;
  }
  index.entries.push(entry);
  index.bySlug.set(entry.slug, entry);
};

const resolveEntrySlug = (relativeSlug: string, slugPrefix: string) => {
  if (!slugPrefix) {
    return relativeSlug;
  }

  if (relativeSlug === "index") {
    return slugPrefix;
  }

  return normalizePath(`${slugPrefix}/${relativeSlug}`);
};

const buildEntryFromFile = async ({
  collection,
  errors,
  file,
  root,
  slugPrefix,
  source,
}: {
  collection: CollectionConfig;
  errors: string[];
  file: string;
  root: string;
  slugPrefix: string;
  source: ContentSource;
}): Promise<Extract<ContentEntry, { kind: "entry" }> | null> => {
  const sourcePath = root
    ? normalizePath(path.join(root, file))
    : normalizePath(file);

  let entrySource = "";
  try {
    entrySource = await source.readFile(sourcePath);
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : `Failed to read ${sourcePath}`
    );
    return null;
  }

  const { frontmatter } = parseFrontmatter(entrySource);
  const frontmatterResult = validateFrontmatter(collection.type, frontmatter);
  if (!frontmatterResult.success) {
    for (const issue of frontmatterResult.errors) {
      errors.push(`${sourcePath}: ${issue}`);
    }
  }

  const resolvedFrontmatter = frontmatterResult.success
    ? frontmatterResult.data
    : (frontmatter as FrontmatterByType[ContentType]);
  const relativeSlug = slugFromFile(file);
  const slug = resolveEntrySlug(relativeSlug, slugPrefix);
  const title =
    typeof resolvedFrontmatter?.title === "string"
      ? resolvedFrontmatter.title
      : titleFromSlug(slug);
  const description =
    typeof resolvedFrontmatter?.description === "string"
      ? resolvedFrontmatter.description
      : undefined;

  return {
    collectionId: collection.id,
    description,
    frontmatter: resolvedFrontmatter,
    kind: "entry",
    relativePath: sourcePath,
    slug,
    sourcePath,
    title,
    type: collection.type,
  };
};

export const buildContentIndex = async (
  source: ContentSource,
  config: SiteConfig
): Promise<ContentIndex> => {
  const errors: string[] = [];
  const index: ContentIndex = {
    byCollection: new Map<string, ContentEntry[]>(),
    bySlug: new Map<string, ContentEntry>(),
    entries: [],
    errors,
  };

  for (const collection of config.collections) {
    const root = normalizePath(collection.root ?? "");
    const slugPrefix = normalizePath(collection.slugPrefix ?? "");
    let files: string[] = [];
    try {
      files = await listContentFiles(source, root);
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : `Failed to read ${root || "."}`
      );
      continue;
    }

    const collectionEntries: ContentEntry[] = [];

    for (const file of files) {
      const entry = await buildEntryFromFile({
        collection,
        errors,
        file,
        root,
        slugPrefix,
        source,
      });
      if (!entry) {
        continue;
      }

      collectionEntries.push(entry);
      addEntry(entry, index, errors);
    }

    const sortConfig = {
      ...sortDefaults[collection.type],
      ...collection.sort,
    };
    const sortField = sortConfig.field ?? "title";
    const sortDirection = sortConfig.direction ?? "asc";
    collectionEntries.sort((left, right) => {
      const leftValue =
        left.kind === "entry"
          ? (left.frontmatter as Record<string, unknown>)[sortField]
          : undefined;
      const rightValue =
        right.kind === "entry"
          ? (right.frontmatter as Record<string, unknown>)[sortField]
          : undefined;
      return compareValues(leftValue, rightValue, sortDirection);
    });

    index.byCollection.set(collection.id, collectionEntries);

    const collectionIndex = getCollectionIndex(collection, slugPrefix);
    if (collectionIndex) {
      const indexEntry: ContentEntry = {
        collectionId: collection.id,
        description: collectionIndex.description,
        kind: "index",
        slug: collectionIndex.slug,
        title: collectionIndex.title ?? titleFromSlug(collectionIndex.slug),
        type: collection.type,
      };
      addEntry(indexEntry, index, errors);
    }
  }

  return index;
};
