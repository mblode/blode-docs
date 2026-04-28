import path from "node:path";

import { ensureArray, normalizePath, slugify } from "@repo/common";
import type {
  CollectionConfig,
  ContentType,
  DocsConfig,
  DocsOpenApiSource,
  FrontmatterByType,
  PageMode,
  SiteConfig,
} from "@repo/models";
import { PageModeSchema } from "@repo/models";
import {
  extractOpenApiOperations,
  openApiIdentifier,
  openApiSlug,
  parseOpenApiSpec,
} from "@repo/prebuild";
import type { OpenApiOperation, OpenApiSpec } from "@repo/prebuild";
import {
  validateDocsConfig,
  validateFrontmatter,
  validateSiteConfig,
} from "@repo/validation";
import YAML from "yaml";

import type { ContentSource } from "./content-source.js";

export { BlobContentSource, createBlobSource } from "./blob-source.js";
export { createFsSource, FsContentSource } from "./fs-source.js";
export type { CompiledMdxResult, ContentSource } from "./content-source.js";

export const PREBUILT_INDEX_PATH = "_content-index.json";
export const PREBUILT_OPENAPI_INDEX_PATH = "_openapi-index.json";
export const PREBUILT_SEARCH_INDEX_PATH = "_search-index.json";
export const PREBUILT_TOC_INDEX_PATH = "_toc-index.json";
export const PREBUILT_UTILITY_INDEX_PATH = "_utility-index.json";
export const PREBUILT_UTILITY_SITEMAP_PATH = "_utility/sitemap.xml";
export const PREBUILT_UTILITY_LLMS_PATH = "_utility/llms.txt";
export const PREBUILT_UTILITY_LLMS_FULL_PATH = "_utility/llms-full.txt";
export const PREBUILT_UTILITY_LLMS_SEGMENT_PREFIX = "_utility/llms/";
export const PREBUILT_UTILITY_SKILLS_INDEX_PATH = "_utility/skills-index.json";
export const PREBUILT_UTILITY_SKILLS_MD_PREFIX = "_utility/skills/";
export const UTILITY_DOCS_ROOT_TOKEN = "__BLODEMD_DOCS_ROOT__";
export const LEGACY_PROJECT_NAME_FALLBACK_WARNING =
  "docs.json.slug is recommended. Falling back to docs.json.name as the deployment slug is deprecated.";

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

export interface SearchIndexItem {
  href?: string;
  title: string;
  path: string;
}

export interface TocItem {
  id: string;
  level: number;
  title: string;
}

export interface UtilityPage {
  content: string;
  description?: string;
  slug: string;
  title: string;
}

export interface UtilitySegment {
  pageSlugs: string[];
  slug: string;
  title: string;
}

export interface UtilityIndex {
  description?: string;
  name: string;
  pages: UtilityPage[];
  segments?: UtilitySegment[];
  slug?: string;
}

export interface UtilityArtifact {
  content: string;
  contentType: string;
  path: string;
}

export interface PrebuiltOpenApiEntry {
  identifier: string;
  operation: OpenApiOperation;
  slug: string;
  source: DocsOpenApiSource;
  sourceKey: string;
  spec: OpenApiSpec;
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

// oxlint-disable-next-line eslint/complexity
const mapDocsConfig = (docs: DocsConfig): SiteConfig => {
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
    logo: docs.logo
      ? {
          dark: typeof docs.logo === "string" ? docs.logo : docs.logo.dark,
          href: typeof docs.logo === "string" ? undefined : docs.logo.href,
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
    slug: docs.slug,
  };
};

const getProjectWarnings = (config: { slug?: string }): string[] =>
  config.slug ? [] : [LEGACY_PROJECT_NAME_FALLBACK_WARNING];

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

    // Try SiteConfig format first (has collections, theme, colors, etc.)
    const siteResult = validateSiteConfig(parsed);
    if (siteResult.success) {
      return {
        config: siteResult.data,
        ok: true,
        warnings: getProjectWarnings(siteResult.data),
      };
    }

    // Fall back to DocsConfig format (Mintlify-compatible) and map to SiteConfig
    const docsResult = validateDocsConfig(parsed);
    if (docsResult.success) {
      return {
        config: mapDocsConfig(docsResult.data),
        ok: true,
        warnings: getProjectWarnings(docsResult.data),
      };
    }

    return { errors: docsResult.errors, ok: false };
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

interface SerializedOpenApiIndex {
  entries: PrebuiltOpenApiEntry[];
  version: 1;
}

interface SerializedSearchIndex {
  items: SearchIndexItem[];
  version: 1;
}

interface SerializedTocIndex {
  itemsBySlug: Record<string, TocItem[]>;
  version: 1;
}

interface SerializedUtilityIndex {
  description?: string;
  name: string;
  pages: UtilityPage[];
  segments?: UtilitySegment[];
  slug?: string;
  version: 1;
}

interface UtilityOpenApiPage extends UtilityPage {
  identifier: string;
  sourceKey: string;
}

const NEWLINE_REGEX = /\r?\n/;
const HEADING_REGEX = /^(#{2,4})\s+(.*)$/;
const LEADING_H1_REGEX = /^#\s+([^\r\n]+)(?:\r?\n(?:\r?\n)?)?/;
const FENCED_CODE_BLOCK_REGEX =
  /(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2(?=\n|$)/g;
const PLACEHOLDER_URL_PATTERN = [
  "https?://(?:[a-z0-9-]+\\.)*example\\.(?:com|org|net)\\b[^\\s)\\]\"'<>]*",
  "https?://discord\\.gg/example\\b[^\\s)\\]\"'<>]*",
  "https?://(?:[a-z0-9-]+\\.)+(?:test|invalid)(?:[/?#:][^\\s)\\]\"'<>]*)?",
  "https?://localhost(?::\\d+)?[^\\s)\\]\"'<>]*",
  "https?://(?:[a-z0-9-]+\\.)*your[-_]?domain\\.[a-z]+\\b[^\\s)\\]\"'<>]*",
  "https?://acme\\.blode\\.md\\b[^\\s)\\]\"'<>]*",
  "https?://github\\.com/example/[^\\s)\\]\"'<>]*",
  "https?://(?:us|eu)\\.i\\.posthog\\.com\\b[^\\s)\\]\"'<>]*",
].join("|");
const PLACEHOLDER_URL_RE = new RegExp(PLACEHOLDER_URL_PATTERN, "gi");
const PLACEHOLDER_MARKDOWN_LINK_RE = new RegExp(
  `\\[([^\\]]+)\\]\\((?:${PLACEHOLDER_URL_PATTERN})\\)`,
  "gi"
);
const INTERNAL_MARKDOWN_LINK_RE = /(!?\[[^\]]+\])\((\/[^)\s]*)\)/g;
const TYPE_TABLE_REGEX = /<TypeTable\s+type=\{\{([\s\S]*?)\}\}\s*\/>/g;
const TYPE_TABLE_ROW_HEADER_REGEX =
  /^\s*(["']?[\w$./<>|{}\-\s]+["']?)\s*:\s*\{\s*$/;
const STRING_FIELD_REGEX = (field: string) =>
  new RegExp(`${field}:\\s*(?:"([^"]*)"|'([^']*)'|\`([^\`]*)\`)`, "s");
const BOOLEAN_FIELD_REGEX = (field: string) =>
  new RegExp(`${field}:\\s*(true|false)`, "s");

const defangUrl = (value: string) => value.replace(/^https?:\/\//i, "");

export const sanitizePlaceholderUrls = (text: string): string =>
  text
    .replace(PLACEHOLDER_MARKDOWN_LINK_RE, "$1")
    .replace(PLACEHOLDER_URL_RE, (match) => `\`${defangUrl(match)}\``);

export const absolutiseInternalLinks = (
  source: string,
  origin: string,
  basePath: string
): string => {
  const normalizedBase = basePath
    ? `/${basePath}`.replaceAll(/\/+/g, "/").replace(/\/$/, "")
    : "";
  return source.replaceAll(
    INTERNAL_MARKDOWN_LINK_RE,
    (_match, label, linkPath) => {
      const alreadyPrefixed =
        normalizedBase &&
        (linkPath === normalizedBase ||
          linkPath.startsWith(`${normalizedBase}/`));
      const absolutePath = alreadyPrefixed
        ? linkPath
        : `${normalizedBase}${linkPath}`.replaceAll(/\/+/g, "/");
      return `${label}(${origin}${absolutePath})`;
    }
  );
};

const getStringProp = (attributes: string, name: string) => {
  const match = new RegExp(
    `${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*"([^"]*)"\\s*\\}|\\{\\s*'([^']*)'\\s*\\})`
  ).exec(attributes);
  return match?.slice(1).find((value) => typeof value === "string");
};

const protectFencedCodeBlocks = (source: string) => {
  const blocks: string[] = [];
  const text = source.replace(FENCED_CODE_BLOCK_REGEX, (match) => {
    const placeholder = `\n@@BLODEMD_CODE_BLOCK_${blocks.length}@@\n`;
    blocks.push(match.trim());
    return placeholder;
  });
  return { blocks, text };
};

const restoreFencedCodeBlocks = (source: string, blocks: string[]) => {
  let restored = source;
  for (const [index, block] of blocks.entries()) {
    restored = restored.replace(`@@BLODEMD_CODE_BLOCK_${index}@@`, block);
  }
  return restored;
};

const compactMarkdown = (source: string) =>
  source
    .replaceAll(/[ \t]+\n/g, "\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();

const getFieldStringValue = (block: string, field: string) => {
  const match = STRING_FIELD_REGEX(field).exec(block);
  return match?.slice(1).find((value) => typeof value === "string");
};

const getFieldBooleanValue = (block: string, field: string) => {
  const match = BOOLEAN_FIELD_REGEX(field).exec(block);
  return match?.[1];
};

const renderTypeTable = (_match: string, body: string) => {
  const rows: string[] = [];
  const lines = body.split(NEWLINE_REGEX);

  for (let index = 0; index < lines.length; index += 1) {
    const header = TYPE_TABLE_ROW_HEADER_REGEX.exec(lines[index] ?? "");
    if (!header) {
      continue;
    }

    const name = (header[1] ?? "").replaceAll(/^["']|["']$/g, "").trim();
    const blockLines: string[] = [];
    index += 1;
    while (index < lines.length) {
      const line = lines[index] ?? "";
      if (/^\s*\},?\s*$/.test(line)) {
        break;
      }
      blockLines.push(line);
      index += 1;
    }

    const block = blockLines.join("\n");
    const type = getFieldStringValue(block, "type") ?? "";
    const description = getFieldStringValue(block, "description") ?? "";
    const required = getFieldBooleanValue(block, "required") ?? "";
    const defaultValue = getFieldStringValue(block, "default") ?? "";
    const meta = [
      type ? `type: ${type}` : null,
      required ? `required: ${required}` : null,
      defaultValue ? `default: ${defaultValue}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    rows.push(`- \`${name}\`${meta ? ` (${meta})` : ""}: ${description}`);
  }

  return rows.length ? rows.join("\n") : "";
};

const transformMdxComponents = (source: string) => {
  let output = source;

  output = output.replaceAll(TYPE_TABLE_REGEX, renderTypeTable);
  output = output.replaceAll(
    /<Installer\s+([^>]*)\/>/g,
    (_match, attributes: string) => {
      const command = getStringProp(attributes, "command");
      return command ? `\`\`\`bash\n${command}\n\`\`\`` : "";
    }
  );
  output = output.replaceAll(
    /<Tree\.Folder\s+([^>]*)>/g,
    (_match, attributes: string) => {
      const name = getStringProp(attributes, "name") ?? "folder";
      return `- ${name}/`;
    }
  );
  output = output.replaceAll(
    /<Tree\.File\s+([^>]*)\/>/g,
    (_match, attributes: string) => {
      const name = getStringProp(attributes, "name") ?? "file";
      return `- ${name}`;
    }
  );
  output = output.replaceAll("</Tree.Folder>", "");
  output = output.replaceAll(/<\/?Tree[^>]*>/g, "");
  output = output.replaceAll(
    /<Frame\s*([^>]*)>([\s\S]*?)<\/Frame>/g,
    (_match, attributes: string, children: string) => {
      const caption = getStringProp(attributes, "caption");
      const hint = getStringProp(attributes, "hint");
      return compactMarkdown(
        [hint, children.trim(), caption ? `Caption: ${caption}` : null]
          .filter(Boolean)
          .join("\n\n")
      );
    }
  );
  output = output.replaceAll(
    /<Callout\s*([^>]*)>([\s\S]*?)<\/Callout>/g,
    (_match, attributes: string, children: string) => {
      const type = (getStringProp(attributes, "type") ?? "note").toUpperCase();
      return `> [!${type}]\n${children
        .trim()
        .split(NEWLINE_REGEX)
        .map((line) => `> ${line}`)
        .join("\n")}`;
    }
  );
  output = output.replaceAll(
    /<Tab\s+([^>]*)>([\s\S]*?)<\/Tab>/g,
    (_match, attributes: string, children: string) => {
      const title =
        getStringProp(attributes, "title") ??
        getStringProp(attributes, "label") ??
        "Tab";
      return `### ${title}\n\n${children.trim()}`;
    }
  );
  output = output.replaceAll(
    /<Step\s+([^>]*)>([\s\S]*?)<\/Step>/g,
    (_match, attributes: string, children: string) => {
      const title = getStringProp(attributes, "title") ?? "Step";
      return `1. **${title}**\n\n${children.trim()}`;
    }
  );
  output = output.replaceAll(
    /<Expandable\s*([^>]*)>([\s\S]*?)<\/Expandable>/g,
    (_match, attributes: string, children: string) => {
      const title = getStringProp(attributes, "title") ?? "Details";
      return `### ${title}\n\n${children.trim()}`;
    }
  );
  output = output.replaceAll(
    /<Card\s*([^>]*)>([\s\S]*?)<\/Card>/g,
    (_match, attributes: string, children: string) => {
      const title = getStringProp(attributes, "title");
      const href = getStringProp(attributes, "href");
      const heading = title
        ? `### ${href ? `[${title}](${href})` : title}`
        : "";
      return compactMarkdown(
        [heading, children.trim()].filter(Boolean).join("\n\n")
      );
    }
  );
  output = output.replaceAll(
    /<\/?(?:Columns|Column|CodeGroup|Tabs|Steps|AccordionGroup|Accordion|CardGroup)[^>]*>/g,
    ""
  );

  return compactMarkdown(output);
};

export const toAgentMarkdown = (source: string): string => {
  const { blocks, text } = protectFencedCodeBlocks(source);
  return compactMarkdown(
    restoreFencedCodeBlocks(transformMdxComponents(text), blocks)
  );
};

export const prepareLlmsFullContent = (
  source: string,
  origin: string,
  basePath: string
) =>
  absolutiseInternalLinks(
    sanitizePlaceholderUrls(toAgentMarkdown(source)),
    origin,
    basePath
  );

export const extractToc = (source: string): TocItem[] => {
  const withoutCode = source.replaceAll(/```[\s\S]*?```/g, "");
  const lines = withoutCode.split(NEWLINE_REGEX);
  const toc: TocItem[] = [];
  const seen = new Map<string, number>();

  for (const line of lines) {
    const match = HEADING_REGEX.exec(line.trim());
    if (!match) {
      continue;
    }

    const [, hashes = "", heading = ""] = match;
    if (!(hashes && heading)) {
      continue;
    }

    const baseId = slugify(heading.trim());
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);

    toc.push({
      id: count === 0 ? baseId : `${baseId}-${count}`,
      level: hashes.length,
      title: heading.trim(),
    });
  }

  return toc;
};

const stripMatchingLeadingH1 = (source: string, title: string) => {
  const trimmed = source.trimStart();
  const match = LEADING_H1_REGEX.exec(trimmed);
  if (!match) {
    return trimmed.trim();
  }

  const [headingLine = "", headingTitle = ""] = match;
  if (slugify(headingTitle) !== slugify(title)) {
    return trimmed.trim();
  }

  return trimmed.slice(headingLine.length).trim();
};

export const formatMarkdownPage = (
  title: string,
  source: string,
  description?: string
) => {
  const content = stripMatchingLeadingH1(source, title);
  const descriptionBlock = description ? `\n\n${description}` : "";
  if (!content) {
    return `# ${title}${descriptionBlock}`;
  }

  return `# ${title}${descriptionBlock}\n\n${content}`;
};

export const formatMarkdownPageSection = (
  title: string,
  url: string,
  source: string,
  description?: string
) => {
  const content = stripMatchingLeadingH1(source, title);
  const descriptionBlock = description ? `\n\n${description}` : "";
  if (!content) {
    return `# ${title} (${url})${descriptionBlock}`;
  }

  return `# ${title} (${url})${descriptionBlock}\n\n${content}`;
};

const shouldIncludeSearchEntry = (
  entry: ContentEntry,
  pageMetadataMap: Map<string, PageMetadata>,
  config: SiteConfig
) => {
  const pageMeta = pageMetadataMap.get(entry.slug);

  if (pageMeta?.hidden || pageMeta?.noindex) {
    return false;
  }

  if (
    config.seo?.indexing !== "all" &&
    entry.kind === "entry" &&
    entry.hidden === true
  ) {
    return false;
  }

  return true;
};

const stripFrontmatter = (source: string) =>
  parseFrontmatter(source).body.trim();

const getDocsCollection = (config: SiteConfig) =>
  config.collections.find((collection) => collection.type === "docs");

const getDocsNavigation = (config: SiteConfig) =>
  getDocsCollection(config)?.navigation ?? config.navigation;

const getDocsCollectionWithNavigation = (
  config: SiteConfig
): SiteConfig["collections"][number] | undefined => {
  const docsCollection = getDocsCollection(config);
  const docsNavigation = getDocsNavigation(config);

  return docsCollection &&
    docsNavigation &&
    docsCollection.navigation !== docsNavigation
    ? { ...docsCollection, navigation: docsNavigation }
    : docsCollection;
};

const getOpenApiSourceKey = (source: DocsOpenApiSource): string =>
  `${source.source}::${source.directory ?? ""}::${(source.include ?? []).join(
    "|"
  )}`;

const toOpenApiSourceObject = (
  value: string | DocsOpenApiSource
): DocsOpenApiSource => {
  if (typeof value === "string") {
    return { source: value };
  }
  return value;
};

const collectOpenApiSources = (collection?: CollectionConfig) => {
  const sources: DocsOpenApiSource[] = [];

  for (const item of ensureArray(collection?.openapi)) {
    if (!item) {
      continue;
    }
    sources.push(toOpenApiSourceObject(item));
  }

  const groups = collection?.navigation?.groups ?? [];
  for (const group of groups) {
    if (!group.openapi) {
      continue;
    }
    sources.push(toOpenApiSourceObject(group.openapi));
  }

  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = getOpenApiSourceKey(source);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const getSchemaTypeLabel = (schema: unknown): string => {
  if (!schema || typeof schema !== "object") {
    return "any";
  }
  const record = schema as Record<string, unknown>;
  if (typeof record.$ref === "string") {
    const last = record.$ref.split("/").pop();
    return last ?? "object";
  }
  if (typeof record.type === "string") {
    if (record.type === "array" && record.items) {
      return `${getSchemaTypeLabel(record.items)}[]`;
    }
    return record.type;
  }
  if (Array.isArray(record.oneOf) || Array.isArray(record.anyOf)) {
    const variants = (record.oneOf ?? record.anyOf) as unknown[];
    return variants.map(getSchemaTypeLabel).join(" | ");
  }
  return "object";
};

const formatParameterLine = (parameter: Record<string, unknown>): string => {
  const name = String(parameter.name ?? "");
  const location = parameter.in ? ` (${parameter.in})` : "";
  const required = parameter.required ? "required" : "optional";
  const type = getSchemaTypeLabel(parameter.schema);
  const description =
    typeof parameter.description === "string" && parameter.description
      ? ` - ${parameter.description.split("\n")[0]}`
      : "";
  return `- \`${name}\`${location}: ${type}, ${required}${description}`;
};

const formatRequestBody = (body: Record<string, unknown>): string => {
  const required = body.required ? "required" : "optional";
  const content = (body.content as Record<string, unknown> | undefined) ?? {};
  const mediaTypes = Object.keys(content);
  if (mediaTypes.length === 0) {
    return `${required} body`;
  }
  return mediaTypes
    .map((mediaType) => {
      const mediaEntry = content[mediaType] as
        | Record<string, unknown>
        | undefined;
      const schemaLabel = getSchemaTypeLabel(mediaEntry?.schema);
      return `- ${mediaType} (${required}): ${schemaLabel}`;
    })
    .join("\n");
};

const formatResponses = (responses: Record<string, unknown>): string =>
  Object.entries(responses)
    .map(([status, value]) => {
      const response = (value as Record<string, unknown>) ?? {};
      const description =
        typeof response.description === "string" && response.description
          ? response.description.split("\n")[0]
          : "";
      const content =
        (response.content as Record<string, unknown> | undefined) ?? {};
      const mediaTypes = Object.keys(content);
      const mediaSuffix = mediaTypes.length
        ? ` [${mediaTypes.join(", ")}]`
        : "";
      return `- ${status}${mediaSuffix}${description ? ` - ${description}` : ""}`;
    })
    .join("\n");

export const formatOpenApiPageContent = (
  operation: OpenApiOperation
): string => {
  const parts = [`Method: ${operation.method}`, `Path: ${operation.path}`];

  if (operation.description) {
    parts.push(operation.description);
  }
  if (operation.tags.length) {
    parts.push(`Tags: ${operation.tags.join(", ")}`);
  }
  if (operation.parameters.length) {
    parts.push(
      `## Parameters\n\n${operation.parameters
        .map(formatParameterLine)
        .join("\n")}`
    );
  }
  if (operation.requestBody) {
    parts.push(
      `## Request body\n\n${formatRequestBody(operation.requestBody)}`
    );
  }
  if (operation.responses) {
    parts.push(`## Responses\n\n${formatResponses(operation.responses)}`);
  }

  return parts.join("\n\n");
};

const getGroupedOpenApiSourceKey = (
  source: string | DocsOpenApiSource
): string => getOpenApiSourceKey(toOpenApiSourceObject(source));

const collectUtilityOpenApiPages = (
  pagesByIdentifier: Map<string, UtilityOpenApiPage>,
  pagesBySource: Map<string, UtilityOpenApiPage[]>,
  operations: OpenApiOperation[],
  directory: string,
  openApiSource: DocsOpenApiSource,
  slugPrefix: string
) => {
  const sourceKey = getOpenApiSourceKey(openApiSource);
  const includeIdentifiers = openApiSource.include?.length
    ? new Set(openApiSource.include)
    : null;

  for (const operation of operations) {
    const identifier = openApiIdentifier(operation.method, operation.path);
    if (includeIdentifiers && !includeIdentifiers.has(identifier)) {
      continue;
    }

    const baseSlug = normalizePath(
      openApiSlug(operation.method, operation.path, directory)
    );
    const slug = slugPrefix
      ? normalizePath(`${slugPrefix}/${baseSlug}`)
      : baseSlug;
    const page = {
      content: formatOpenApiPageContent(operation),
      description: operation.description,
      identifier,
      slug,
      sourceKey,
      title: operation.summary ?? identifier,
    } satisfies UtilityOpenApiPage;

    pagesByIdentifier.set(identifier, page);
    if (!pagesBySource.has(sourceKey)) {
      pagesBySource.set(sourceKey, []);
    }
    pagesBySource.get(sourceKey)?.push(page);
  }
};

const addUtilityPagesFromSourceKey = (
  pages: Map<string, UtilityPage>,
  pagesBySource: Map<string, UtilityOpenApiPage[]>,
  sourceKey: string
) => {
  for (const page of pagesBySource.get(sourceKey) ?? []) {
    pages.set(page.slug, page);
  }
};

const addReferencedUtilityPages = (
  pages: Map<string, UtilityPage>,
  pagesByIdentifier: Map<string, UtilityOpenApiPage>,
  pageReferences: string[] | undefined,
  hiddenPages: Set<string>,
  groupHidden = false
) => {
  for (const pageReference of pageReferences ?? []) {
    if (groupHidden || hiddenPages.has(pageReference)) {
      continue;
    }

    const page = pagesByIdentifier.get(pageReference);
    if (page) {
      pages.set(page.slug, page);
    }
  }
};

const buildUtilityOpenApiPages = async (
  config: SiteConfig,
  collection: CollectionConfig | undefined,
  source: ContentSource
) => {
  if (!collection || collection.type !== "docs") {
    return [] satisfies UtilityPage[];
  }

  const docsNavigation = getDocsNavigation(config);
  const hiddenPages = new Set(docsNavigation?.hidden);
  const slugPrefix = normalizePath(collection.slugPrefix ?? "");
  const byIdentifier = new Map<string, UtilityOpenApiPage>();
  const bySource = new Map<string, UtilityOpenApiPage[]>();
  const pages = new Map<string, UtilityPage>();
  const sources = collectOpenApiSources(collection);

  const resolved = await Promise.all(
    sources.map(async (item) => {
      const rawSpec = await source.readFile(item.source);
      const spec = parseOpenApiSpec(rawSpec, item.source);
      const directory = item.directory ?? "api";
      const { operations } = extractOpenApiOperations(spec, directory);
      return { directory, operations, source: item };
    })
  );

  for (const { directory, operations, source: openApiSource } of resolved) {
    collectUtilityOpenApiPages(
      byIdentifier,
      bySource,
      operations,
      directory,
      openApiSource,
      slugPrefix
    );
  }

  for (const openApiSource of ensureArray(collection.openapi)) {
    if (!openApiSource) {
      continue;
    }
    addUtilityPagesFromSourceKey(
      pages,
      bySource,
      getGroupedOpenApiSourceKey(openApiSource)
    );
  }

  for (const group of docsNavigation?.groups ?? []) {
    const groupHidden = group.hidden === true;
    addReferencedUtilityPages(
      pages,
      byIdentifier,
      group.pages,
      hiddenPages,
      groupHidden
    );

    if (groupHidden || !group.openapi) {
      continue;
    }
    addUtilityPagesFromSourceKey(
      pages,
      bySource,
      getGroupedOpenApiSourceKey(group.openapi)
    );
  }

  addReferencedUtilityPages(
    pages,
    byIdentifier,
    docsNavigation?.pages,
    hiddenPages
  );

  return [...pages.values()];
};

export const buildSearchIndex = (
  index: ContentIndex,
  config: SiteConfig,
  utilityIndex?: UtilityIndex
): SearchIndexItem[] => {
  const pageMetadataMap = buildPageMetadataMap(index);
  const items = new Map<string, SearchIndexItem>();

  for (const page of utilityIndex?.pages ?? []) {
    items.set(page.slug, {
      path: page.slug,
      title: page.title,
    });
  }

  for (const entry of index.entries) {
    if (!shouldIncludeSearchEntry(entry, pageMetadataMap, config)) {
      continue;
    }

    const pageMeta = pageMetadataMap.get(entry.slug);
    items.set(entry.slug, {
      href: pageMeta?.url,
      path: entry.slug,
      title: pageMeta?.sidebarTitle ?? entry.title,
    });
  }

  return [...items.values()];
};

const collectUtilitySegments = (
  config: SiteConfig,
  pages: Map<string, UtilityPage>
): UtilitySegment[] => {
  const segments = new Map<string, UtilitySegment>();
  const addGroup = (group: {
    group?: string;
    hidden?: boolean;
    pages?: string[];
  }) => {
    if (group.hidden || !group.group) {
      return;
    }
    const pageSlugs = (group.pages ?? []).filter((page) => pages.has(page));
    if (pageSlugs.length === 0) {
      return;
    }
    const slug = slugify(group.group);
    segments.set(slug, { pageSlugs, slug, title: group.group });
  };

  const navigation = getDocsNavigation(config);
  for (const group of navigation?.groups ?? []) {
    addGroup(group);
  }
  for (const tab of navigation?.tabs ?? []) {
    for (const group of tab.groups ?? []) {
      addGroup(group);
    }
  }

  return [...segments.values()];
};

export const buildUtilityIndex = async (
  index: ContentIndex,
  source: ContentSource,
  config: SiteConfig
): Promise<UtilityIndex> => {
  const pageMetadataMap = buildPageMetadataMap(index);
  const pages = new Map<string, UtilityPage>();

  for (const entry of index.entries) {
    if (entry.kind !== "entry") {
      continue;
    }

    if (!shouldIncludeSearchEntry(entry, pageMetadataMap, config)) {
      continue;
    }

    const rawContent = await source.readFile(entry.relativePath);
    pages.set(entry.slug, {
      content: stripFrontmatter(rawContent),
      description: entry.description,
      slug: entry.slug,
      title: entry.title,
    });
  }

  for (const page of await buildUtilityOpenApiPages(
    config,
    getDocsCollectionWithNavigation(config),
    source
  )) {
    pages.set(page.slug, page);
  }

  const sortedPages = [...pages.values()];
  // oxlint-disable-next-line eslint-plugin-unicorn/no-array-sort
  sortedPages.sort((left, right) => left.slug.localeCompare(right.slug));

  return {
    description: config.description,
    name: config.name,
    pages: sortedPages,
    segments: collectUtilitySegments(config, pages),
    slug: config.slug,
  };
};

const toUtilityDocPath = (value: string) => {
  const clean = normalizePath(value);
  if (!clean || clean === "index") {
    return "/";
  }
  return `/${clean}`;
};

const toUtilityTemplatedDocUrl = (value: string) =>
  `${UTILITY_DOCS_ROOT_TOKEN}${toUtilityDocPath(value)}`;

const toUtilityTemplatedMarkdownDocUrl = (value: string) => {
  const clean = normalizePath(value);
  if (!clean || clean === "index") {
    return `${UTILITY_DOCS_ROOT_TOKEN}/index.md`;
  }
  return `${UTILITY_DOCS_ROOT_TOKEN}/${clean}.md`;
};

export const getPrebuiltUtilityLlmPagePath = (slug: string) => {
  const normalized = normalizePath(slug);
  return `_utility/llms-pages/${normalized || "index"}.mdx`;
};

export const buildUtilityArtifacts = (
  index: UtilityIndex
): UtilityArtifact[] => {
  const segments = index.segments ?? [];
  const segmentLines =
    segments.length > 0
      ? [
          "",
          "## Segments",
          ...segments.map(
            (segment) =>
              `- [${segment.title}](${UTILITY_DOCS_ROOT_TOKEN}/llms/${segment.slug}.txt)`
          ),
        ]
      : [];
  const llmsLines = [
    `# ${index.name}`,
    index.description ? `> ${index.description}` : null,
    "",
    `Sitemap: ${toUtilityTemplatedDocUrl("sitemap.xml")}`,
    `Full content: ${UTILITY_DOCS_ROOT_TOKEN}/llms-full.txt`,
    `Skills: ${UTILITY_DOCS_ROOT_TOKEN}/.well-known/skills/index.json`,
    ...segmentLines,
    "",
    "## Docs",
    ...index.pages.map((page) => {
      const description = page.description ? `: ${page.description}` : "";
      return `- [${page.title}](${toUtilityTemplatedMarkdownDocUrl(page.slug)})${description}`;
    }),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${index.pages
  .map(
    (page) => `  <url><loc>${toUtilityTemplatedDocUrl(page.slug)}</loc></url>`
  )
  .join("\n")}
</urlset>`;

  const llmsFull = index.pages
    .map((page) =>
      formatMarkdownPageSection(
        page.title,
        toUtilityTemplatedDocUrl(page.slug),
        prepareLlmsFullContent(page.content, UTILITY_DOCS_ROOT_TOKEN, ""),
        page.description
      )
    )
    .join("\n\n");

  const skillSlug = index.slug ?? slugify(index.name);
  const skillDescription =
    `${index.name} documentation. ${index.description ?? ""}`.trim();
  const skillsIndex = JSON.stringify(
    {
      skills: [
        {
          description: skillDescription,
          files: ["SKILL.md"],
          name: skillSlug,
        },
      ],
    },
    null,
    2
  );

  const topPages = index.pages.slice(0, 20);
  const skillMdLines = [
    "---",
    `name: ${skillSlug}`,
    `description: ${skillDescription} Use when working with ${index.name}, answering questions about its features, or helping users follow its guides.`,
    "---",
    "",
    `# ${index.name}`,
    "",
    index.description ? `${index.description}\n` : "",
    "## Documentation",
    "",
    `- Full docs index: ${UTILITY_DOCS_ROOT_TOKEN}/llms.txt`,
    `- Complete docs content: ${UTILITY_DOCS_ROOT_TOKEN}/llms-full.txt`,
    "- Append `.md` to any page URL for raw markdown",
    "",
    "## Key Pages",
    "",
    ...topPages.map((page) => {
      const desc = page.description ? ` - ${page.description}` : "";
      return `- [${page.title}](${toUtilityTemplatedMarkdownDocUrl(
        page.slug
      )})${desc}`;
    }),
  ];

  return [
    {
      content: sitemap,
      contentType: "application/xml; charset=utf-8",
      path: PREBUILT_UTILITY_SITEMAP_PATH,
    },
    {
      content: llmsLines.filter((line) => line !== null).join("\n"),
      contentType: "text/plain; charset=utf-8",
      path: PREBUILT_UTILITY_LLMS_PATH,
    },
    {
      content: llmsFull,
      contentType: "text/plain; charset=utf-8",
      path: PREBUILT_UTILITY_LLMS_FULL_PATH,
    },
    {
      content: skillsIndex,
      contentType: "application/json; charset=utf-8",
      path: PREBUILT_UTILITY_SKILLS_INDEX_PATH,
    },
    {
      content: skillMdLines.filter((line) => line !== null).join("\n"),
      contentType: "text/markdown; charset=utf-8",
      path: `${PREBUILT_UTILITY_SKILLS_MD_PREFIX}${skillSlug}/SKILL.md`,
    },
    ...segments.map((segment) => {
      const segmentPages = index.pages.filter((page) =>
        segment.pageSlugs.includes(page.slug)
      );
      const content = [
        `# ${index.name} - ${segment.title}`,
        `> Segment of ${UTILITY_DOCS_ROOT_TOKEN}/llms-full.txt`,
        "",
        ...segmentPages.map((page) =>
          formatMarkdownPageSection(
            page.title,
            toUtilityTemplatedDocUrl(page.slug),
            prepareLlmsFullContent(page.content, UTILITY_DOCS_ROOT_TOKEN, ""),
            page.description
          )
        ),
      ].join("\n\n");

      return {
        content,
        contentType: "text/plain; charset=utf-8",
        path: `${PREBUILT_UTILITY_LLMS_SEGMENT_PREFIX}${segment.slug}.txt`,
      };
    }),
    ...index.pages.map((page) => ({
      content: formatMarkdownPage(
        page.title,
        toAgentMarkdown(page.content),
        page.description
      ),
      contentType: "text/markdown; charset=utf-8",
      path: getPrebuiltUtilityLlmPagePath(page.slug),
    })),
  ];
};

export const buildTocIndex = async (
  index: ContentIndex,
  source: ContentSource
): Promise<Map<string, TocItem[]>> => {
  const itemsBySlug = new Map<string, TocItem[]>();

  for (const entry of index.entries) {
    if (entry.kind !== "entry") {
      continue;
    }

    const rawContent = await source.readFile(entry.relativePath);
    itemsBySlug.set(entry.slug, extractToc(rawContent));
  }

  return itemsBySlug;
};

export const serializeContentIndex = (index: ContentIndex): string =>
  JSON.stringify({
    collections: Object.fromEntries(index.byCollection),
    entries: index.entries,
    version: 1,
  } satisfies SerializedContentIndex);

export const serializeOpenApiIndex = (
  entries: PrebuiltOpenApiEntry[]
): string =>
  JSON.stringify({
    entries,
    version: 1,
  } satisfies SerializedOpenApiIndex);

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

export const loadPrebuiltOpenApiIndex = async (
  source: ContentSource
): Promise<PrebuiltOpenApiEntry[] | null> => {
  try {
    const raw = await source.readFile(PREBUILT_OPENAPI_INDEX_PATH);
    const data = JSON.parse(raw) as SerializedOpenApiIndex;
    if (data.version !== 1 || !Array.isArray(data.entries)) {
      return null;
    }

    return data.entries;
  } catch {
    return null;
  }
};

export const serializeSearchIndex = (items: SearchIndexItem[]): string =>
  JSON.stringify({
    items,
    version: 1,
  } satisfies SerializedSearchIndex);

export const loadPrebuiltSearchIndex = async (
  source: ContentSource
): Promise<SearchIndexItem[] | null> => {
  try {
    const raw = await source.readFile(PREBUILT_SEARCH_INDEX_PATH);
    const data = JSON.parse(raw) as SerializedSearchIndex;
    if (data.version !== 1 || !Array.isArray(data.items)) {
      return null;
    }

    return data.items;
  } catch {
    return null;
  }
};

export const serializeTocIndex = (
  itemsBySlug: Map<string, TocItem[]>
): string =>
  JSON.stringify({
    itemsBySlug: Object.fromEntries(itemsBySlug),
    version: 1,
  } satisfies SerializedTocIndex);

export const loadPrebuiltTocIndex = async (
  source: ContentSource
): Promise<Map<string, TocItem[]> | null> => {
  try {
    const raw = await source.readFile(PREBUILT_TOC_INDEX_PATH);
    const data = JSON.parse(raw) as SerializedTocIndex;
    if (data.version !== 1 || typeof data.itemsBySlug !== "object") {
      return null;
    }

    return new Map(Object.entries(data.itemsBySlug ?? {}));
  } catch {
    return null;
  }
};

export const serializeUtilityIndex = (index: UtilityIndex): string =>
  JSON.stringify({
    ...index,
    version: 1,
  } satisfies SerializedUtilityIndex);

export const loadPrebuiltUtilityIndex = async (
  source: ContentSource
): Promise<UtilityIndex | null> => {
  try {
    const raw = await source.readFile(PREBUILT_UTILITY_INDEX_PATH);
    const data = JSON.parse(raw) as SerializedUtilityIndex;
    if (
      data.version !== 1 ||
      typeof data.name !== "string" ||
      !Array.isArray(data.pages)
    ) {
      return null;
    }

    return {
      description: data.description,
      name: data.name,
      pages: data.pages,
      segments: Array.isArray(data.segments) ? data.segments : undefined,
      slug: data.slug,
    };
  } catch {
    return null;
  }
};
