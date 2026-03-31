import { timingSafeEqual } from "node:crypto";

export const getHeaderToken = (
  headers: Record<string, unknown>,
  name: string
): string | null => {
  const value = headers[name];
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

export const getBearerToken = (
  headers: Record<string, unknown>
): string | null => {
  const authorization = getHeaderToken(headers, "authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer") {
    return null;
  }

  return token?.trim() || null;
};

export const constantTimeEquals = (left: string, right: string): boolean => {
  const actual = Buffer.from(left);
  const expected = Buffer.from(right);
  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
};
