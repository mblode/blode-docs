import { normalizePath, withLeadingSlash } from "@repo/common";

export const toDocHref = (path: string, basePath = "") => {
  const clean = normalizePath(path);
  const base = basePath ? withLeadingSlash(basePath) : "";
  if (!clean || clean === "index") {
    return base || "/";
  }
  return `${base}/${clean}`.replaceAll(/\/+/g, "/");
};
