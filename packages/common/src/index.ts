const BACKSLASH_TO_SLASH_REGEX = /\\/g;
const TRAILING_SLASHES_REGEX = /\/+$/g;
const LEADING_SLASHES_REGEX = /^\/+/;
const PORT_REGEX = /:\d+$/;
type EnvLike = Record<string, string | undefined>;

export const LOCAL_ROOT_HOSTS = [
  "localhost",
  "127.0.0.1",
  "docs.localhost",
] as const;

export const normalizePath = (value: string) => {
  const trimmed = value
    .replace(BACKSLASH_TO_SLASH_REGEX, "/")
    .replace(TRAILING_SLASHES_REGEX, "");
  return trimmed.replace(LEADING_SLASHES_REGEX, "");
};

export const normalizeHost = (value: string) =>
  value.trim().replace(PORT_REGEX, "").toLowerCase();

export const getPortlessHostFromEnv = (env: EnvLike) => {
  const portlessUrl = env.PORTLESS_URL?.trim();
  if (!portlessUrl) {
    return null;
  }

  try {
    return normalizeHost(new URL(portlessUrl).host);
  } catch {
    return normalizeHost(portlessUrl);
  }
};

export const getLocalRootHostsFromEnv = (env: EnvLike) => {
  const hosts = new Set<string>(LOCAL_ROOT_HOSTS);
  const portlessHost = getPortlessHostFromEnv(env);
  if (portlessHost) {
    hosts.add(portlessHost);
  }
  return hosts;
};

export const withLeadingSlash = (value: string) => {
  if (!value) {
    return "/";
  }
  return value.startsWith("/") ? value : `/${value}`;
};

export const withoutLeadingSlash = (value: string) => {
  if (!value) {
    return "";
  }
  return value.startsWith("/") ? value.slice(1) : value;
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)+/g, "");

const IGNORED_ROOT_DOCS_FILES = new Set([
  ".gitignore",
  "AGENTS.md",
  "CLAUDE.md",
  "LICENSE",
  "LICENSE.md",
  "README.md",
]);

export const shouldIgnoreRootDocsFile = (value: string) => {
  const normalized = normalizePath(value);
  if (!normalized || normalized.includes("/")) {
    return false;
  }
  return IGNORED_ROOT_DOCS_FILES.has(normalized);
};

export const ensureArray = <T>(value?: T | T[]) => {
  if (value === undefined) {
    return [] as T[];
  }
  return Array.isArray(value) ? value : [value];
};

export const uniq = <T>(values: T[]) => [...new Set(values)];

export const safeJsonParse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
