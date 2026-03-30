import path from "node:path";

import { normalizePath } from "@repo/common";
import {
  buildContentIndex,
  createBlobSource,
  loadSiteConfig,
  PREBUILT_INDEX_PATH,
  serializeContentIndex,
} from "@repo/previewing";
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
