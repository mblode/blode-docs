import path from "node:path";

import { ensureArray, normalizePath } from "@repo/common";
import { compileContent } from "@repo/mdx-compiler";
import type { CompiledMdx } from "@repo/mdx-compiler";
import type {
  CollectionConfig,
  DocsOpenApiSource,
  SiteConfig,
} from "@repo/models";
import {
  extractOpenApiOperations,
  openApiIdentifier,
  openApiSlug,
  parseOpenApiSpec,
} from "@repo/prebuild";
import {
  buildUtilityArtifacts,
  buildSearchIndex,
  buildContentIndex,
  buildTocIndex,
  buildUtilityIndex,
  createBlobSource,
  loadSiteConfig,
  PREBUILT_INDEX_PATH,
  PREBUILT_OPENAPI_INDEX_PATH,
  PREBUILT_SEARCH_INDEX_PATH,
  PREBUILT_TOC_INDEX_PATH,
  PREBUILT_UTILITY_INDEX_PATH,
  serializeOpenApiIndex,
  serializeSearchIndex,
  serializeTocIndex,
  serializeContentIndex,
  serializeUtilityIndex,
} from "@repo/previewing";
import type { ContentSource, PrebuiltOpenApiEntry } from "@repo/previewing";
import { list, put } from "@vercel/blob";

const DEPLOYMENT_ROOT = "deployments";
const SITE_CONFIG_FILE = "docs.json";

interface DeploymentManifestFile {
  path: string;
  url: string;
}

interface DeploymentManifest {
  files: DeploymentManifestFile[];
  version: 1;
}

export class PublishValidationError extends Error {
  name = "PublishValidationError";
}

export const isPublishValidationError = (
  error: unknown
): error is PublishValidationError => error instanceof PublishValidationError;

const getDocsCollection = (
  config: SiteConfig
): SiteConfig["collections"][number] | undefined =>
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

const toSourceObject = (
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
    const key = getOpenApiSourceKey(source);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const buildPrebuiltOpenApiIndex = async (
  collection: CollectionConfig | undefined,
  source: ContentSource
): Promise<PrebuiltOpenApiEntry[]> => {
  if (!collection || collection.type !== "docs") {
    return [];
  }

  const entries: PrebuiltOpenApiEntry[] = [];
  const slugPrefix = normalizePath(collection.slugPrefix ?? "");
  const sources = collectOpenApiSources(collection);
  const resolved = await Promise.all(
    sources.map(async (openApiSource) => {
      const rawSpec = await source.readFile(openApiSource.source);
      const spec = parseOpenApiSpec(rawSpec, openApiSource.source);
      const directory = openApiSource.directory ?? "api";
      const { operations } = extractOpenApiOperations(spec, directory);
      return { directory, operations, source: openApiSource, spec };
    })
  );

  for (const {
    directory,
    operations,
    source: openApiSource,
    spec,
  } of resolved) {
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
      entries.push({
        identifier,
        operation,
        slug: slugPrefix
          ? normalizePath(`${slugPrefix}/${baseSlug}`)
          : baseSlug,
        source: openApiSource,
        sourceKey,
        spec,
      });
    }
  }

  return entries;
};

const normalizeDeploymentFilePath = (value: string) => {
  if (value.startsWith("/") || value.startsWith("\\")) {
    throw new PublishValidationError(
      `Invalid deployment file path "${value}".`
    );
  }

  const normalized = normalizePath(path.posix.normalize(value));
  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new PublishValidationError(
      `Invalid deployment file path "${value}".`
    );
  }

  return normalized;
};

const getDeploymentRoot = (projectSlug: string, deploymentId: string) =>
  `${DEPLOYMENT_ROOT}/${projectSlug}/${deploymentId}`;

const getFilesPrefix = (projectSlug: string, deploymentId: string) =>
  `${getDeploymentRoot(projectSlug, deploymentId)}/files/`;

const getManifestPath = (projectSlug: string, deploymentId: string) =>
  `${getDeploymentRoot(projectSlug, deploymentId)}/manifest.json`;

const listAllBlobs = async (prefix: string) => {
  const blobs: Awaited<ReturnType<typeof list>>["blobs"] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const page = await list({ cursor, prefix });
    const { cursor: nextCursor, hasMore: nextHasMore } = page;
    blobs.push(...page.blobs);
    cursor = nextCursor;
    hasMore = nextHasMore;
  }

  return blobs;
};

export const uploadDeploymentFile = async (input: {
  projectSlug: string;
  deploymentId: string;
  relativePath: string;
  content: Buffer;
  contentType?: string;
}) => {
  const relativePath = normalizeDeploymentFilePath(input.relativePath);
  const pathname = `${getFilesPrefix(input.projectSlug, input.deploymentId)}${relativePath}`;
  const blob = await put(pathname, input.content, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: input.contentType,
  });

  return {
    path: relativePath,
    url: blob.url,
  };
};

const BATCH_UPLOAD_CONCURRENCY = 10;

export const uploadDeploymentFiles = async (
  projectSlug: string,
  deploymentId: string,
  files: { relativePath: string; content: Buffer; contentType?: string }[]
) => {
  const results: { path: string; url: string }[] = [];

  for (let i = 0; i < files.length; i += BATCH_UPLOAD_CONCURRENCY) {
    const batch = files.slice(i, i + BATCH_UPLOAD_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((file) =>
        uploadDeploymentFile({ ...file, deploymentId, projectSlug })
      )
    );
    results.push(...batchResults);
  }

  return results;
};

const COMPILED_MDX_PREFIX = "_compiled/";
const MDX_FILE_REGEX = /\.(mdx|md)$/;
const GENERATED_MDX_PREFIX = "_utility/";
const COMPILE_CONCURRENCY = 10;

const compileDeploymentMdx = async (
  source: ContentSource,
  files: DeploymentManifestFile[],
  projectSlug: string,
  deploymentId: string
): Promise<DeploymentManifestFile[]> => {
  const mdxFiles = files.filter(
    (file) =>
      MDX_FILE_REGEX.test(file.path) &&
      !file.path.startsWith(GENERATED_MDX_PREFIX)
  );
  if (!mdxFiles.length) {
    return [];
  }

  const compiledFiles: DeploymentManifestFile[] = [];
  const filesPrefix = getFilesPrefix(projectSlug, deploymentId);

  // Process in batches to limit concurrency
  for (let i = 0; i < mdxFiles.length; i += COMPILE_CONCURRENCY) {
    const batch = mdxFiles.slice(i, i + COMPILE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (file) => {
        const rawContent = await source.readFile(file.path);
        const compiled: CompiledMdx = await compileContent(rawContent);
        const compiledPath = `${COMPILED_MDX_PREFIX}${file.path}.json`;
        const blob = await put(
          `${filesPrefix}${compiledPath}`,
          JSON.stringify(compiled),
          {
            access: "public",
            addRandomSuffix: false,
            allowOverwrite: true,
            contentType: "application/json; charset=utf-8",
          }
        );
        return { path: compiledPath, url: blob.url };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        compiledFiles.push(result.value);
      }
      // Compilation failures are non-fatal — runtime falls back to on-demand compilation
    }
  }

  return compiledFiles;
};

export const finalizeDeploymentManifest = async (input: {
  projectSlug: string;
  deploymentId: string;
}) => {
  const prefix = getFilesPrefix(input.projectSlug, input.deploymentId);
  const blobs = await listAllBlobs(prefix);
  const files = blobs
    .map((blob) => ({
      path: blob.pathname.slice(prefix.length),
      url: blob.url,
    }))
    .filter((file) => file.path);
  // oxlint-disable-next-line eslint-plugin-unicorn/no-array-sort
  files.sort((left, right) => left.path.localeCompare(right.path));

  if (!files.some((file) => file.path === SITE_CONFIG_FILE)) {
    throw new PublishValidationError(
      `Deployment is missing ${SITE_CONFIG_FILE}.`
    );
  }

  // Build and upload pre-built content index for fast runtime loading
  const tempManifest: DeploymentManifest = { files, version: 1 };
  const tempManifestBlob = await put(
    getManifestPath(input.projectSlug, input.deploymentId),
    JSON.stringify(tempManifest, null, 2),
    {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
    }
  );

  try {
    const source = createBlobSource(tempManifestBlob.url);
    const configResult = await loadSiteConfig(source);
    if (configResult.ok) {
      const docsCollectionWithNavigation = getDocsCollectionWithNavigation(
        configResult.config
      );
      const filesPrefix = getFilesPrefix(input.projectSlug, input.deploymentId);
      const putJson = (blobPath: string, content: string) =>
        put(`${filesPrefix}${blobPath}`, content, {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "application/json; charset=utf-8",
        });

      // Phase 1: content index (required by all subsequent indices)
      const contentIndex = await buildContentIndex(source, configResult.config);
      const indexBlob = await putJson(
        PREBUILT_INDEX_PATH,
        serializeContentIndex(contentIndex)
      );
      files.push({ path: PREBUILT_INDEX_PATH, url: indexBlob.url });

      // Phase 2: toc + utility + OpenAPI indices in parallel.
      const [tocIndex, utilityIndex, openApiIndex] = await Promise.all([
        buildTocIndex(contentIndex, source),
        buildUtilityIndex(contentIndex, source, configResult.config),
        buildPrebuiltOpenApiIndex(docsCollectionWithNavigation, source),
      ]);

      const [tocIndexBlob, utilityIndexBlob, openApiIndexBlob] =
        await Promise.all([
          putJson(PREBUILT_TOC_INDEX_PATH, serializeTocIndex(tocIndex)),
          putJson(
            PREBUILT_UTILITY_INDEX_PATH,
            serializeUtilityIndex(utilityIndex)
          ),
          putJson(
            PREBUILT_OPENAPI_INDEX_PATH,
            serializeOpenApiIndex(openApiIndex)
          ),
        ]);
      files.push({ path: PREBUILT_TOC_INDEX_PATH, url: tocIndexBlob.url });
      files.push({
        path: PREBUILT_UTILITY_INDEX_PATH,
        url: utilityIndexBlob.url,
      });
      files.push({
        path: PREBUILT_OPENAPI_INDEX_PATH,
        url: openApiIndexBlob.url,
      });

      // Phase 3: search index + utility artifacts (sync builds, parallel uploads)
      const searchIndex = buildSearchIndex(
        contentIndex,
        configResult.config,
        utilityIndex
      );
      const artifacts = buildUtilityArtifacts(utilityIndex);

      const uploadResults = await Promise.all([
        putJson(
          PREBUILT_SEARCH_INDEX_PATH,
          serializeSearchIndex(searchIndex)
        ).then((blob) => ({ path: PREBUILT_SEARCH_INDEX_PATH, url: blob.url })),
        ...artifacts.map((artifact) =>
          put(`${filesPrefix}${artifact.path}`, artifact.content, {
            access: "public",
            addRandomSuffix: false,
            allowOverwrite: true,
            contentType: artifact.contentType,
          }).then((blob) => ({ path: artifact.path, url: blob.url }))
        ),
      ]);
      files.push(...uploadResults);

      // Phase 4: pre-compile MDX (already parallelized internally)
      try {
        const compiledFiles = await compileDeploymentMdx(
          source,
          files,
          input.projectSlug,
          input.deploymentId
        );
        files.push(...compiledFiles);
      } catch {
        // MDX compilation is optional — runtime falls back to on-demand compilation
      }
    }
  } catch {
    // Content index generation is optional — continue without it
  }

  const manifest: DeploymentManifest = {
    files,
    version: 1,
  };
  const manifestBlob = await put(
    getManifestPath(input.projectSlug, input.deploymentId),
    JSON.stringify(manifest, null, 2),
    {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
    }
  );

  return {
    fileCount: files.length,
    manifestUrl: manifestBlob.url,
  };
};
