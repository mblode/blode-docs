import path from "node:path";

import { normalizePath } from "@repo/common";
import { compileContent } from "@repo/mdx-compiler";
import type { CompiledMdx } from "@repo/mdx-compiler";
import {
  buildUtilityArtifacts,
  buildSearchIndex,
  buildContentIndex,
  buildTocIndex,
  buildUtilityIndex,
  createBlobSource,
  loadSiteConfig,
  PREBUILT_INDEX_PATH,
  PREBUILT_SEARCH_INDEX_PATH,
  PREBUILT_TOC_INDEX_PATH,
  PREBUILT_UTILITY_INDEX_PATH,
  serializeSearchIndex,
  serializeTocIndex,
  serializeContentIndex,
  serializeUtilityIndex,
} from "@repo/previewing";
import type { ContentSource } from "@repo/previewing";
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

const normalizeDeploymentFilePath = (value: string) => {
  if (value.startsWith("/") || value.startsWith("\\")) {
    throw new Error(`Invalid deployment file path "${value}".`);
  }

  const normalized = normalizePath(path.posix.normalize(value));
  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Invalid deployment file path "${value}".`);
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

const COMPILED_MDX_PREFIX = "_compiled/";
const MDX_FILE_REGEX = /\.(mdx|md)$/;
const COMPILE_CONCURRENCY = 10;

const compileDeploymentMdx = async (
  source: ContentSource,
  files: DeploymentManifestFile[],
  projectSlug: string,
  deploymentId: string
): Promise<DeploymentManifestFile[]> => {
  const mdxFiles = files.filter((file) => MDX_FILE_REGEX.test(file.path));
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
    throw new Error(`Deployment is missing ${SITE_CONFIG_FILE}.`);
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
      const contentIndex = await buildContentIndex(source, configResult.config);
      const indexJson = serializeContentIndex(contentIndex);
      const indexBlob = await put(
        `${getFilesPrefix(input.projectSlug, input.deploymentId)}${PREBUILT_INDEX_PATH}`,
        indexJson,
        {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "application/json; charset=utf-8",
        }
      );
      files.push({ path: PREBUILT_INDEX_PATH, url: indexBlob.url });

      const tocIndex = await buildTocIndex(contentIndex, source);
      const tocIndexBlob = await put(
        `${getFilesPrefix(input.projectSlug, input.deploymentId)}${PREBUILT_TOC_INDEX_PATH}`,
        serializeTocIndex(tocIndex),
        {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "application/json; charset=utf-8",
        }
      );
      files.push({
        path: PREBUILT_TOC_INDEX_PATH,
        url: tocIndexBlob.url,
      });

      const utilityIndex = await buildUtilityIndex(
        contentIndex,
        source,
        configResult.config
      );
      const utilityIndexBlob = await put(
        `${getFilesPrefix(input.projectSlug, input.deploymentId)}${PREBUILT_UTILITY_INDEX_PATH}`,
        serializeUtilityIndex(utilityIndex),
        {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "application/json; charset=utf-8",
        }
      );
      files.push({
        path: PREBUILT_UTILITY_INDEX_PATH,
        url: utilityIndexBlob.url,
      });

      const searchIndex = buildSearchIndex(
        contentIndex,
        configResult.config,
        utilityIndex
      );
      const searchIndexBlob = await put(
        `${getFilesPrefix(input.projectSlug, input.deploymentId)}${PREBUILT_SEARCH_INDEX_PATH}`,
        serializeSearchIndex(searchIndex),
        {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "application/json; charset=utf-8",
        }
      );
      files.push({
        path: PREBUILT_SEARCH_INDEX_PATH,
        url: searchIndexBlob.url,
      });

      for (const artifact of buildUtilityArtifacts(utilityIndex)) {
        const artifactBlob = await put(
          `${getFilesPrefix(input.projectSlug, input.deploymentId)}${artifact.path}`,
          artifact.content,
          {
            access: "public",
            addRandomSuffix: false,
            allowOverwrite: true,
            contentType: artifact.contentType,
          }
        );
        files.push({
          path: artifact.path,
          url: artifactBlob.url,
        });
      }

      // Pre-compile MDX files for instant runtime rendering
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
