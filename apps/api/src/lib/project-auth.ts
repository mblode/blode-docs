import type { UserRecord } from "@repo/db";
import type { Context } from "hono";

import { authenticateApiKey } from "./api-key-auth";
import { adminApiToken } from "./config";
import { apiKeyDao, projectDao } from "./db";
import { constantTimeEquals, getHeaderToken } from "./header-auth";
import { authenticateUser } from "./user-auth";

const getHeadersRecord = (c: Context): Record<string, string> =>
  Object.fromEntries(c.req.raw.headers.entries());

const hasAdminAccess = (headers: Record<string, unknown>) => {
  if (!adminApiToken) {
    return false;
  }
  const token = getHeaderToken(headers, "x-admin-token");
  return token ? constantTimeEquals(token, adminApiToken) : false;
};

export const authorizeAdminRequest = (c: Context): boolean =>
  hasAdminAccess(getHeadersRecord(c));

export const authorizeProjectRequest = async (
  c: Context,
  projectId: string,
  options: {
    allowAdmin?: boolean;
    allowProjectApiKey?: boolean;
    allowUser?: boolean;
  } = {}
) => {
  const allowAdmin = options.allowAdmin ?? true;
  const allowProjectApiKey = options.allowProjectApiKey ?? true;
  const allowUser = options.allowUser ?? true;
  const headers = getHeadersRecord(c);

  if (allowAdmin && hasAdminAccess(headers)) {
    return true;
  }

  if (allowProjectApiKey) {
    const apiKey = await authenticateApiKey(headers, apiKeyDao);
    if (apiKey && apiKey.projectId === projectId) {
      return true;
    }
  }

  if (allowUser) {
    const user = await authenticateUser(headers);
    if (user) {
      const project = await projectDao.getById(projectId);
      return project?.userId === user.id;
    }
  }

  return false;
};

export const getAuthenticatedUser = (
  c: Context
): Promise<UserRecord | null> => {
  const headers = getHeadersRecord(c);
  return authenticateUser(headers);
};
