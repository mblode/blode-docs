import { rootDomain } from "./config";
import { readTrimmedEnv } from "./env";

const toOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const getConfiguredOrigins = () => {
  const configured = readTrimmedEnv("CORS_ALLOWED_ORIGINS");
  if (!configured) {
    return [];
  }

  return configured
    .split(/[,\s]+/u)
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => {
      const origin = toOrigin(value) ?? value;
      return origin ? [origin] : [];
    });
};

const getDefaultOrigins = () => {
  const origins = new Set<string>([
    "http://127.0.0.1:3001",
    "http://localhost:3001",
    `https://${rootDomain}`,
    `https://admin.${rootDomain}`,
    `https://app.${rootDomain}`,
    `https://dashboard.${rootDomain}`,
    `https://www.${rootDomain}`,
  ]);

  const docsAppUrl = readTrimmedEnv("DOCS_APP_URL");
  if (docsAppUrl) {
    const origin = toOrigin(docsAppUrl);
    if (origin) {
      origins.add(origin);
    }
  }

  const portlessUrl = readTrimmedEnv("PORTLESS_URL");
  if (portlessUrl) {
    const origin = toOrigin(portlessUrl);
    if (origin) {
      origins.add(origin);
    }
  }

  return [...origins];
};

export const getAllowedCorsOrigins = () => [
  ...new Set([...getDefaultOrigins(), ...getConfiguredOrigins()]),
];

export const resolveCorsOrigin = (origin: string): string | null => {
  const normalizedOrigin = toOrigin(origin);
  if (!normalizedOrigin) {
    return null;
  }

  return getAllowedCorsOrigins().includes(normalizedOrigin)
    ? normalizedOrigin
    : null;
};
