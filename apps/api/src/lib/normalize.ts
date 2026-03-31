import { domainToASCII } from "node:url";

const PORT_REGEX = /:\d+$/;
const HAS_PROTOCOL_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;
const TRAILING_SLASHES_REGEX = /\/+$/;
const LEADING_SLASHES_REGEX = /^\/+/;
const BACKSLASH_TO_SLASH_REGEX = /\\/g;
const DUPLICATE_SLASHES_REGEX = /\/{2,}/g;

export const normalizeHost = (host: string) =>
  host.trim().replace(PORT_REGEX, "").toLowerCase();

const toInputUrl = (value: string): URL | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = HAS_PROTOCOL_REGEX.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(candidate);
  } catch {
    return null;
  }
};

export const normalizeHostnameInput = (value: string) => {
  const url = toInputUrl(value);
  if (!(url && url.hostname) || url.username || url.password) {
    return null;
  }

  const asciiHostname = domainToASCII(url.hostname);
  if (!asciiHostname) {
    return null;
  }

  return normalizeHost(asciiHostname);
};

export const normalizePathPrefix = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalized = withSlash
    .replace(BACKSLASH_TO_SLASH_REGEX, "/")
    .replace(DUPLICATE_SLASHES_REGEX, "/")
    .replace(TRAILING_SLASHES_REGEX, "");

  return normalized || null;
};

export const slugifyPath = (value: string) => {
  const trimmed = value
    .replace(BACKSLASH_TO_SLASH_REGEX, "/")
    .replace(TRAILING_SLASHES_REGEX, "");
  return trimmed.replace(LEADING_SLASHES_REGEX, "");
};

export const stripPrefix = (
  pathname: string,
  prefix: string | null
): string | null => {
  if (!prefix) {
    return slugifyPath(pathname);
  }
  const normalizedPath = slugifyPath(pathname);
  const normalizedPrefix = slugifyPath(prefix);
  if (!normalizedPrefix) {
    return normalizedPath;
  }
  if (normalizedPath === normalizedPrefix) {
    return "";
  }
  if (normalizedPath.startsWith(`${normalizedPrefix}/`)) {
    return normalizedPath.slice(normalizedPrefix.length + 1);
  }
  return null;
};
