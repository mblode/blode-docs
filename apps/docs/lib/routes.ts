import { normalizePath, withLeadingSlash } from "@repo/common";

const ABSOLUTE_URL_REGEX = /^[a-z][a-z\d+.-]*:/i;

export const toDocHref = (path: string, basePath = "") => {
  const clean = normalizePath(path);
  const base = basePath ? withLeadingSlash(basePath) : "";
  if (!clean || clean === "index") {
    return base || "/";
  }
  return `${base}/${clean}`.replaceAll(/\/+/g, "/");
};

export const isExternalHref = (href: string) =>
  ABSOLUTE_URL_REGEX.test(href) || href.startsWith("//");

export const resolveHref = (href: string, basePath = "") => {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("?") ||
    isExternalHref(href)
  ) {
    return href;
  }

  const suffixIndex = href.search(/[?#]/);
  const pathPart = suffixIndex === -1 ? href : href.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : href.slice(suffixIndex);
  const normalizedBase = basePath
    ? withLeadingSlash(basePath).replaceAll(/\/+$/g, "")
    : "";
  const normalizedPath = withLeadingSlash(pathPart || "/");

  if (
    normalizedBase &&
    (normalizedPath === normalizedBase ||
      normalizedPath.startsWith(`${normalizedBase}/`))
  ) {
    return `${normalizedPath}${suffix}`;
  }

  return `${toDocHref(pathPart || "index", basePath)}${suffix}`;
};
