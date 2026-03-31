import { normalizePath, withLeadingSlash } from "@repo/common";

const ABSOLUTE_URL_REGEX = /^[a-z][a-z\d+.-]*:/i;
const MARKDOWN_EXPORT_EXTENSIONS = [".md", ".mdx"] as const;

export const stripBasePath = (value: string, basePath: string) => {
  if (!basePath) {
    return value;
  }
  if (value === basePath) {
    return "/";
  }
  if (value.startsWith(`${basePath}/`)) {
    return value.slice(basePath.length) || "/";
  }
  return value;
};

export const toDocHref = (path: string, basePath = "") => {
  const clean = normalizePath(path);
  const base = basePath ? withLeadingSlash(basePath) : "";
  if (!clean || clean === "index") {
    return base || "/";
  }
  return `${base}/${clean}`.replaceAll(/\/+/g, "/");
};

export const toMarkdownDocHref = (path: string, basePath = "") => {
  const href = toDocHref(path, basePath);
  return href === "/" ? "/.md" : `${href}.md`;
};

export const getMarkdownExportSourcePath = (pathname: string) => {
  for (const extension of MARKDOWN_EXPORT_EXTENSIONS) {
    if (pathname.endsWith(extension)) {
      return pathname.slice(0, -extension.length) || "/";
    }
  }

  return null;
};

export const getMarkdownExportSlug = (pathname: string, basePath = "") => {
  const sourcePath = getMarkdownExportSourcePath(pathname);
  if (sourcePath === null) {
    return null;
  }

  const relativePath = stripBasePath(sourcePath, basePath);
  return relativePath === "/" ? "" : relativePath.slice(1);
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
