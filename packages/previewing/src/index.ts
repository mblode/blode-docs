import path from "node:path";

import { normalizePath } from "@repo/common";
import type {
  CollectionConfig,
  ContentType,
  FrontmatterByType,
  MintlifyDocsConfig,
  PageMode,
  SiteConfig,
} from "@repo/models";
import { PageModeSchema } from "@repo/models";
import { validateDocsConfig, validateFrontmatter } from "@repo/validation";
import YAML from "yaml";

import type { ContentSource } from "./content-source.js";

export { BlobContentSource, createBlobSource } from "./blob-source.js";
export { createFsSource, FsContentSource } from "./fs-source.js";
export type { CompiledMdxResult, ContentSource } from "./content-source.js";

export const PREBUILT_INDEX_PATH = "_content-index.json";

export type SiteConfigResult =
  | { ok: true; config: SiteConfig; warnings: string[] }
  | { ok: false; errors: string[] };

export type ContentEntry =
  | {
      kind: "entry";
      slug: string;
      title: string;
      description?: string;
      hidden?: boolean;
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

export interface PageMetadata {
  title?: string;
  sidebarTitle?: string;
  icon?: string;
  iconType?: string;
  tag?: string;
  hidden?: boolean;
  deprecated?: boolean;
  url?: string;
  mode?: PageMode;
  noindex?: boolean;
  hideFooterPagination?: boolean;
  hideApiMarker?: boolean;
  keywords?: string[];
}

const validModes = new Set<string>(PageModeSchema.options);

export const buildPageMetadataMap = (
  index: ContentIndex
): Map<string, PageMetadata> => {
  const map = new Map<string, PageMetadata>();
  for (const entry of index.entries) {
    if (entry.kind !== "entry") {
      continue;
    }
    const fm = entry.frontmatter as Record<string, unknown>;
    const meta: PageMetadata = {
      title: entry.title,
    };
    const hasFields = true;
    if (typeof fm.sidebarTitle === "string") {
      meta.sidebarTitle = fm.sidebarTitle;
    }
    if (typeof fm.icon === "string") {
      meta.icon = fm.icon;
    }
    if (typeof fm.iconType === "string") {
      meta.iconType = fm.iconType;
    }
    if (typeof fm.tag === "string") {
      meta.tag = fm.tag;
    }
    if (typeof fm.hidden === "boolean") {
      meta.hidden = fm.hidden;
    }
    if (typeof fm.deprecated === "boolean") {
      meta.deprecated = fm.deprecated;
    }
    if (typeof fm.url === "string") {
      meta.url = fm.url;
    }
    if (typeof fm.mode === "string" && validModes.has(fm.mode)) {
      meta.mode = fm.mode as PageMode;
    }
    if (typeof fm.noindex === "boolean") {
      meta.noindex = fm.noindex;
    }
    if (typeof fm.hideFooterPagination === "boolean") {
      meta.hideFooterPagination = fm.hideFooterPagination;
    }
    if (typeof fm.hideApiMarker === "boolean") {
      meta.hideApiMarker = fm.hideApiMarker;
    }
    if (Array.isArray(fm.keywords)) {
      meta.keywords = fm.keywords as string[];
    }
    if (hasFields) {
      map.set(entry.slug, meta);
    }
  }
  return map;
};

const DOCS_CONFIG_FILE = "docs.json";
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

const defaultLinkLabel = (input: {
  href: string;
  label?: string;
  type?: "discord" | "github";
}) => {
  if (input.label) {
    return input.label;
  }
  if (input.type === "github") {
    return "GitHub";
  }
  if (input.type === "discord") {
    return "Discord";
  }
  try {
    return new URL(input.href).hostname;
  } catch {
    return input.href;
  }
};

const buildGoogleFontsCssUrl = (
  fonts: MintlifyDocsConfig["fonts"]
): string | undefined => {
  if (!fonts) {
    return undefined;
  }

  const fontEntries: { family: string; source?: string }[] = [];
  if (fonts.family) {
    fontEntries.push({ family: fonts.family, source: fonts.source });
  }
  if (fonts.body) {
    fontEntries.push({
      family: fonts.body.family,
      source: fonts.body.source,
    });
  }
  if (fonts.heading) {
    fontEntries.push({
      family: fonts.heading.family,
      source: fonts.heading.source,
    });
  }

  const googleFamilies = [
    ...new Set(
      fontEntries.filter((entry) => !entry.source).map((entry) => entry.family)
    ),
  ];
  if (!googleFamilies.length) {
    return undefined;
  }

  const params = googleFamilies.map(
    (family) => `family=${encodeURIComponent(family).replaceAll("%20", "+")}`
  );
  return `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap`;
};

// oxlint-disable-next-line eslint/complexity
const mapDocsConfig = (docs: MintlifyDocsConfig): SiteConfig => {
  const navigation = {
    global:
      docs.navbar?.links?.length || docs.navigation.global?.anchors?.length
        ? {
            anchors: docs.navigation.global?.anchors?.map((anchor) => ({
              href: anchor.href,
              label: anchor.anchor,
            })),
            links: docs.navbar?.links?.map((link) => ({
              href: link.href,
              label: defaultLinkLabel(link),
            })),
          }
        : undefined,
    groups: docs.navigation.groups?.map((group) => ({
      expanded: group.expanded,
      group: group.group,
      hidden: group.hidden,
      pages: group.root
        ? [
            group.root,
            ...(group.pages ?? []).filter((page) => page !== group.root),
          ]
        : group.pages,
    })),
    languages: docs.navigation.languages?.map((language) => ({
      label: language.language,
      locale: language.language,
      url: language.href,
    })),
    pages: docs.navigation.pages,
    tabs: docs.navigation.tabs?.map((tab) => ({
      groups: tab.groups?.map((group) => ({
        expanded: group.expanded,
        group: group.group,
        hidden: group.hidden,
        pages: group.root
          ? [
              group.root,
              ...(group.pages ?? []).filter((page) => page !== group.root),
            ]
          : group.pages,
      })),
      href: tab.href,
      icon: tab.icon,
      label: tab.tab,
      pages: tab.pages,
    })),
    versions: docs.navigation.versions?.map((version) => ({
      label: version.version,
      url: version.href,
    })),
  } satisfies SiteConfig["navigation"];

  const baseFontFamily = docs.fonts?.family;
  const fonts =
    docs.fonts && (baseFontFamily || docs.fonts.body || docs.fonts.heading)
      ? {
          body: docs.fonts.body?.family ?? baseFontFamily,
          cssUrl: buildGoogleFontsCssUrl(docs.fonts),
          heading: docs.fonts.heading?.family ?? baseFontFamily,
          provider: "google" as const,
        }
      : undefined;

  return {
    collections: [
      {
        id: "docs",
        navigation,
        openapi: docs.api?.openapi,
        root: "",
        type: "docs",
      },
    ],
    colors: docs.colors,
    contextual: docs.contextual,
    description: docs.description,
    favicon:
      typeof docs.favicon === "string" ? docs.favicon : docs.favicon?.light,
    features: {
      rightToc: true,
      search: true,
      themeToggle: docs.appearance?.strict !== true,
      toc: true,
    },
    fonts,
    logo: docs.logo
      ? {
          dark: typeof docs.logo === "string" ? docs.logo : docs.logo.dark,
          light: typeof docs.logo === "string" ? docs.logo : docs.logo.light,
        }
      : undefined,
    name: docs.name,
    navigation,
    openapiProxy: {
      enabled:
        docs.api?.playground?.proxy !== false &&
        Boolean(docs.api?.openapi || docs.api?.asyncapi),
    },
    seo: docs.seo,
    theme: docs.theme,
  };
};

const readJsonConfig = async (source: ContentSource, relativePath: string) =>
  JSON.parse(await source.readFile(relativePath)) as unknown;

const normalizeRefPath = (baseDirectory: string, reference: string) => {
  if (
    reference.startsWith("/") ||
    reference.startsWith("\\") ||
    reference.startsWith("http://") ||
    reference.startsWith("https://")
  ) {
    throw new Error(
      `Invalid $ref "${reference}". Only relative JSON files are supported.`
    );
  }

  const normalized = normalizePath(path.posix.join(baseDirectory, reference));
  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Invalid $ref "${reference}".`);
  }
  return normalized;
};

const resolveJsonRefs = async (
  source: ContentSource,
  value: unknown,
  baseDirectory: string,
  seen: Set<string>
): Promise<unknown> => {
  if (Array.isArray(value)) {
    return await Promise.all(
      value.map((item) => resolveJsonRefs(source, item, baseDirectory, seen))
    );
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const reference = record.$ref;
  if (typeof reference === "string") {
    const resolvedPath = normalizeRefPath(baseDirectory, reference);
    if (seen.has(resolvedPath)) {
      throw new Error(`Circular $ref detected for "${resolvedPath}".`);
    }

    const nextSeen = new Set(seen);
    // oxlint-disable-next-line eslint-plugin-unicorn/no-immediate-mutation
    nextSeen.add(resolvedPath);
    const referenced = await readJsonConfig(source, resolvedPath);
    const referencedValue = await resolveJsonRefs(
      source,
      referenced,
      path.posix.dirname(resolvedPath) === "."
        ? ""
        : normalizePath(path.posix.dirname(resolvedPath)),
      nextSeen
    );

    const siblingEntries = Object.entries(record).filter(
      ([key]) => key !== "$ref"
    );
    if (
      !siblingEntries.length ||
      !referencedValue ||
      typeof referencedValue !== "object" ||
      Array.isArray(referencedValue)
    ) {
      return referencedValue;
    }

    const siblingValue = await resolveJsonRefs(
      source,
      Object.fromEntries(siblingEntries),
      baseDirectory,
      seen
    );
    return {
      ...(referencedValue as Record<string, unknown>),
      ...(siblingValue as Record<string, unknown>),
    };
  }

  const resolvedEntries = await Promise.all(
    Object.entries(record).map(async ([key, entryValue]) => [
      key,
      await resolveJsonRefs(source, entryValue, baseDirectory, seen),
    ])
  );
  return Object.fromEntries(resolvedEntries);
};

const readResolvedJsonConfig = async (
  source: ContentSource,
  relativePath: string
) =>
  await resolveJsonRefs(
    source,
    await readJsonConfig(source, relativePath),
    path.posix.dirname(relativePath) === "."
      ? ""
      : normalizePath(path.posix.dirname(relativePath)),
    new Set([relativePath])
  );

const loadDocsConfig = async (
  source: ContentSource
): Promise<SiteConfigResult | null> => {
  if (!(await source.exists(DOCS_CONFIG_FILE))) {
    return null;
  }

  try {
    const parsed = await readResolvedJsonConfig(source, DOCS_CONFIG_FILE);
    const result = validateDocsConfig(parsed);
    if (!result.success) {
      return { errors: result.errors, ok: false };
    }
    return {
      config: mapDocsConfig(result.data),
      ok: true,
      warnings: [],
    };
  } catch (error) {
    return {
      errors: [
        error instanceof Error
          ? error.message
          : `Failed to load ${DOCS_CONFIG_FILE}`,
      ],
      ok: false,
    };
  }
};

export const loadSiteConfig = async (
  source: ContentSource
): Promise<SiteConfigResult> => {
  const docsConfig = await loadDocsConfig(source);
  if (docsConfig) {
    return docsConfig;
  }

  return {
    errors: [`${DOCS_CONFIG_FILE} not found.`],
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

  const hidden =
    typeof resolvedFrontmatter?.hidden === "boolean"
      ? resolvedFrontmatter.hidden
      : undefined;

  return {
    collectionId: collection.id,
    description,
    frontmatter: resolvedFrontmatter,
    hidden: hidden || undefined,
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

    const resolvedEntries = await Promise.all(
      files.map(
        async (file) =>
          await buildEntryFromFile({
            collection,
            errors,
            file,
            root,
            slugPrefix,
            source,
          })
      )
    );

    for (const entry of resolvedEntries) {
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

interface SerializedContentIndex {
  version: 1;
  entries: ContentEntry[];
  collections: Record<string, ContentEntry[]>;
}

export const serializeContentIndex = (index: ContentIndex): string =>
  JSON.stringify({
    collections: Object.fromEntries(index.byCollection),
    entries: index.entries,
    version: 1,
  } satisfies SerializedContentIndex);

export const loadPrebuiltContentIndex = async (
  source: ContentSource
): Promise<ContentIndex | null> => {
  try {
    const raw = await source.readFile(PREBUILT_INDEX_PATH);
    const data = JSON.parse(raw) as SerializedContentIndex;
    if (data.version !== 1 || !Array.isArray(data.entries)) {
      return null;
    }

    const bySlug = new Map<string, ContentEntry>();
    const byCollection = new Map<string, ContentEntry[]>();

    for (const entry of data.entries) {
      bySlug.set(entry.slug, entry);
    }

    for (const [collectionId, entries] of Object.entries(
      data.collections ?? {}
    )) {
      byCollection.set(collectionId, entries);
    }

    return {
      byCollection,
      bySlug,
      entries: data.entries,
      errors: [],
    };
  } catch {
    return null;
  }
};
