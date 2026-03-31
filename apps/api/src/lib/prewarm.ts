import { normalizePath, withLeadingSlash } from "@repo/common";
import { createBlobSource, loadPrebuiltUtilityIndex } from "@repo/previewing";

import { buildTenant } from "./tenant-builder";

const PREWARM_CONCURRENCY = 5;
const PREWARM_PROTOCOL = "https";
const STATIC_PREWARM_PATHS = [
  "index",
  "llms-full.txt",
  "llms.txt",
  "robots.txt",
  "search",
  "sitemap.xml",
];

const toDocHref = (path: string, basePath = "") => {
  const clean = normalizePath(path);
  const base = basePath ? withLeadingSlash(basePath) : "";
  if (!clean || clean === "index") {
    return base || "/";
  }
  return `${base}/${clean}`.replaceAll(/\/+/g, "/");
};

export const buildTenantPrewarmUrls = (input: {
  pageSlugs: string[];
  pathPrefix?: string;
  primaryDomain: string;
}) => {
  const hrefs = new Set<string>();
  const basePath = input.pathPrefix ?? "";

  for (const path of [...STATIC_PREWARM_PATHS, ...input.pageSlugs]) {
    const href = toDocHref(path, basePath);
    hrefs.add(`${PREWARM_PROTOCOL}://${input.primaryDomain}${href}`);
  }

  return [...hrefs];
};

export const prewarmProject = async (projectId: string) => {
  const tenant = await buildTenant(projectId);
  if (!(tenant?.activeDeploymentManifestUrl && tenant.primaryDomain)) {
    return;
  }

  const source = createBlobSource(tenant.activeDeploymentManifestUrl);
  const utilityIndex = await loadPrebuiltUtilityIndex(source);
  const urls = buildTenantPrewarmUrls({
    pageSlugs: utilityIndex?.pages.map((page) => page.slug) ?? [],
    pathPrefix: tenant.pathPrefix,
    primaryDomain: tenant.primaryDomain,
  });

  for (let index = 0; index < urls.length; index += PREWARM_CONCURRENCY) {
    const batch = urls.slice(index, index + PREWARM_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const response = await fetch(url, {
          headers: {
            accept: "text/html,application/xhtml+xml",
            "user-agent": "blodemd-prewarm/1.0",
          },
        });

        if (!response.ok) {
          throw new Error(`Prewarm failed for ${url}: ${response.status}`);
        }
      })
    );

    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );
    if (failures.length > 0) {
      const messages = failures
        .slice(0, 3)
        .map((failure) =>
          failure.reason instanceof Error
            ? failure.reason.message
            : String(failure.reason)
        );
      throw new Error(
        `Prewarm failed for ${failures.length} URL(s): ${messages.join("; ")}`
      );
    }
  }
};
