import { ensureArray, normalizePath } from "@repo/common";
import type { CollectionConfig, DocsOpenApiSource } from "@repo/models";
import {
  extractOpenApiOperations,
  openApiIdentifier,
  openApiSlug,
  parseOpenApiSpec,
} from "@repo/prebuild";
import type { OpenApiOperation, OpenApiSpec } from "@repo/prebuild";
import type { ContentSource } from "@repo/previewing";

export interface OpenApiEntry {
  slug: string;
  identifier: string;
  operation: OpenApiOperation;
  spec: OpenApiSpec;
  source: DocsOpenApiSource;
  sourceKey: string;
}

export interface OpenApiRegistry {
  entries: OpenApiEntry[];
  bySlug: Map<string, OpenApiEntry>;
  byIdentifier: Map<string, OpenApiEntry>;
  bySource: Map<string, OpenApiEntry[]>;
}

const toSourceObject = (
  value: string | DocsOpenApiSource
): DocsOpenApiSource => {
  if (typeof value === "string") {
    return { source: value };
  }
  return value;
};

export const collectOpenApiSources = (collection?: CollectionConfig) => {
  const sources: DocsOpenApiSource[] = [];

  for (const item of ensureArray(collection?.openapi)) {
    if (!item) {
      continue;
    }
    sources.push(toSourceObject(item));
  }

  const groups = collection?.navigation?.groups ?? [];
  for (const group of groups) {
    if (!group.openapi) {
      continue;
    }
    sources.push(toSourceObject(group.openapi));
  }

  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.source}::${source.directory ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const buildOpenApiRegistry = async (
  collection: CollectionConfig | undefined,
  contentSource: ContentSource
): Promise<OpenApiRegistry> => {
  if (!collection || collection.type !== "docs") {
    return {
      byIdentifier: new Map<string, OpenApiEntry>(),
      bySlug: new Map<string, OpenApiEntry>(),
      bySource: new Map<string, OpenApiEntry[]>(),
      entries: [],
    };
  }

  const entries: OpenApiEntry[] = [];
  const bySlug = new Map<string, OpenApiEntry>();
  const byIdentifier = new Map<string, OpenApiEntry>();
  const bySource = new Map<string, OpenApiEntry[]>();
  const slugPrefix = normalizePath(collection.slugPrefix ?? "");

  for (const source of collectOpenApiSources(collection)) {
    const rawSpec = await contentSource.readFile(source.source);
    const spec = parseOpenApiSpec(rawSpec, source.source);
    const directory = source.directory ?? "api";
    const { operations } = extractOpenApiOperations(spec, directory);
    const sourceKey = `${source.source}::${source.directory ?? ""}`;

    for (const operation of operations) {
      const baseSlug = normalizePath(
        openApiSlug(operation.method, operation.path, directory)
      );
      const slug = slugPrefix
        ? normalizePath(`${slugPrefix}/${baseSlug}`)
        : baseSlug;
      const identifier = openApiIdentifier(operation.method, operation.path);
      const entry: OpenApiEntry = {
        identifier,
        operation,
        slug: normalizePath(slug),
        source,
        sourceKey,
        spec,
      };
      entries.push(entry);
      bySlug.set(entry.slug, entry);
      byIdentifier.set(entry.identifier, entry);
      if (!bySource.has(sourceKey)) {
        bySource.set(sourceKey, []);
      }
      bySource.get(sourceKey)?.push(entry);
    }
  }

  return { byIdentifier, bySlug, bySource, entries };
};
