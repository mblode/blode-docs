import { docsApiBase } from "./env";

interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  accessToken?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const buildUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const url = new URL(path.startsWith("/") ? path : `/${path}`, docsApiBase);
  return url.toString();
};

export const apiFetch = async <T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const { accessToken, body, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };
  if (accessToken) {
    finalHeaders.Authorization = `Bearer ${accessToken}`;
  }
  let serializedBody: string | undefined;
  if (body !== undefined) {
    finalHeaders["Content-Type"] ??= "application/json";
    serializedBody = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    body: serializedBody,
    cache: rest.cache ?? "no-store",
    headers: finalHeaders,
  });

  const text = await response.text();
  let json: unknown;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof json === "object" && json && "error" in json
        ? String((json as { error: unknown }).error)
        : `Request failed: ${response.status}`;
    throw new ApiError(message, response.status, json);
  }

  return json as T;
};
