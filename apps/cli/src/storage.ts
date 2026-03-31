import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

import { CONFIG_DIR, CREDENTIALS_FILE } from "./constants.js";
import { CliError, EXIT_CODES } from "./errors.js";
import type {
  ApiKeyCredentials,
  AuthFileData,
  StoredAuthSession,
  StoredSessionUser,
} from "./types.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readNullableString = (value: unknown): string | null | undefined => {
  if (value === undefined || value === null) {
    return null;
  }

  return typeof value === "string" ? value : undefined;
};

const parseStoredSessionUser = (
  value: unknown
): StoredSessionUser | null | undefined => {
  if (value === undefined || value === null) {
    return null;
  }

  if (!isRecord(value) || typeof value.id !== "string") {
    return undefined;
  }

  const email = readNullableString(value.email);
  if (email === undefined) {
    return undefined;
  }

  return {
    email,
    id: value.id,
  };
};

const parseStoredAuthSession = (value: unknown): StoredAuthSession | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.accessToken !== "string") {
    return null;
  }

  const refreshToken = readNullableString(value.refreshToken);
  if (refreshToken === undefined) {
    return null;
  }

  const expiresAt = readNullableString(value.expiresAt);
  if (expiresAt === undefined) {
    return null;
  }

  const user = parseStoredSessionUser(value.user);
  if (user === undefined) {
    return null;
  }

  if (typeof value.createdAt !== "string") {
    return null;
  }

  return {
    accessToken: value.accessToken,
    createdAt: value.createdAt,
    expiresAt,
    refreshToken,
    user,
  };
};

const parseApiKeyCredentials = (value: unknown): ApiKeyCredentials | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.apiKey !== "string") {
    return null;
  }

  return { apiKey: value.apiKey, type: "api-key" };
};

const createInvalidCredentialsError = (detail?: string): CliError =>
  new CliError(
    detail
      ? `Invalid credentials format in ${CREDENTIALS_FILE}: ${detail}`
      : `Invalid credentials format in ${CREDENTIALS_FILE}`,
    EXIT_CODES.ERROR
  );

const parseAuthFile = (raw: string): AuthFileData => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new CliError(
      `Invalid credentials JSON in ${CREDENTIALS_FILE}`,
      EXIT_CODES.ERROR
    );
  }

  if (!isRecord(parsed) || parsed.version !== 1) {
    throw createInvalidCredentialsError();
  }

  const hasSession = Object.hasOwn(parsed, "session");
  const hasApiKey = Object.hasOwn(parsed, "apiKey");
  const session =
    hasSession && parsed.session !== undefined
      ? parseStoredAuthSession(parsed.session)
      : undefined;
  const apiKey =
    hasApiKey && parsed.apiKey !== undefined
      ? parseApiKeyCredentials(parsed.apiKey)
      : undefined;

  if (hasSession && parsed.session !== undefined && !session) {
    throw createInvalidCredentialsError("stored session is malformed.");
  }

  if (hasApiKey && parsed.apiKey !== undefined && !apiKey) {
    throw createInvalidCredentialsError("stored API key is malformed.");
  }

  return {
    apiKey: apiKey ?? undefined,
    session: session ?? undefined,
    version: 1,
  };
};

export const readAuthFile = async (): Promise<AuthFileData | null> => {
  try {
    const raw = await readFile(CREDENTIALS_FILE, "utf8");
    return parseAuthFile(raw);
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") {
      return null;
    }

    if (error instanceof CliError) {
      throw error;
    }

    throw new CliError(
      `Failed to read credentials file at ${CREDENTIALS_FILE}`,
      EXIT_CODES.ERROR
    );
  }
};

export const readStoredAuthSession =
  async (): Promise<StoredAuthSession | null> => {
    const data = await readAuthFile();
    return data?.session ?? null;
  };

export const readStoredApiKey = async (): Promise<ApiKeyCredentials | null> => {
  const data = await readAuthFile();
  return data?.apiKey ?? null;
};

const writeAuthFile = async (data: AuthFileData): Promise<void> => {
  await mkdir(CONFIG_DIR, { mode: 0o700, recursive: true });
  await writeFile(CREDENTIALS_FILE, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
};

export const writeStoredAuthSession = async (
  session: StoredAuthSession
): Promise<void> => {
  await writeAuthFile({
    session,
    version: 1,
  });
};

export const writeStoredApiKey = async (
  apiKey: ApiKeyCredentials
): Promise<void> => {
  await writeAuthFile({
    apiKey,
    version: 1,
  });
};

export const clearStoredCredentials = async (): Promise<void> => {
  await rm(CREDENTIALS_FILE, { force: true });
};
