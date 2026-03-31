import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { ApiKeyAuthRecord, ApiKeyDao } from "@repo/db";

import { getBearerToken, getHeaderToken } from "./header-auth";

const API_KEY_PREFIX = "ndk_";
const API_KEY_PREFIX_LENGTH = 8;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const getTokenFromHeaders = (headers: Record<string, unknown>) =>
  getBearerToken(headers) ?? getHeaderToken(headers, "x-api-key");

const getTokenPrefix = (token: string) => {
  const [prefix] = token.split(".", 1);
  return prefix ?? "";
};

const matchesTokenHash = (token: string, tokenHash?: string | null) => {
  if (!tokenHash) {
    return false;
  }

  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(tokenHash, "hex");
  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
};

export const createApiKeyToken = () => {
  const prefix = `${API_KEY_PREFIX}${randomBytes(API_KEY_PREFIX_LENGTH / 2).toString("hex")}`;
  const secret = randomBytes(24).toString("hex");
  const token = `${prefix}.${secret}`;

  return {
    prefix,
    token,
    tokenHash: hashToken(token),
  };
};

export const authenticateApiKey = async (
  headers: Record<string, unknown>,
  apiKeyDao: ApiKeyDao
): Promise<ApiKeyAuthRecord | null> => {
  const token = getTokenFromHeaders(headers);
  if (!token) {
    return null;
  }

  const prefix = getTokenPrefix(token);
  if (!prefix) {
    return null;
  }

  const apiKey = await apiKeyDao.getByPrefix(prefix);
  if (
    !apiKey ||
    apiKey.revokedAt ||
    !matchesTokenHash(token, apiKey.tokenHash)
  ) {
    return null;
  }

  await apiKeyDao.update(apiKey.id, { lastUsedAt: new Date() });
  return apiKey;
};
