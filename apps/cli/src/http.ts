import { classifyHttpStatus, CliError } from "./errors.js";

const readJson = async (response: Response): Promise<unknown> => {
  const responseText = await response.text();
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
};

const HINT_BY_STATUS: Record<number, string> = {
  401: 'Run "blodemd login", or set BLODEMD_API_KEY.',
  403: "This account cannot access that project.",
  404: 'Check the project slug, or run "blodemd projects" to list them.',
  429: "Rate limited. Wait a moment and try again.",
};

const hintForStatus = (status: number): string | undefined =>
  HINT_BY_STATUS[status] ??
  (status >= 500 ? "The API is failing. Try again shortly." : undefined);

export const requestJson = async <T>(
  url: string,
  init: RequestInit,
  message: string
): Promise<T> => {
  const response = await fetch(url, init);
  const data = await readJson(response);
  if (!response.ok) {
    const detail =
      typeof data === "string" ? data : JSON.stringify(data ?? {}, null, 2);
    const { code, exitCode } = classifyHttpStatus(response.status);
    // A typed error, not a string the caller has to regex for a status.
    throw new CliError(
      `${message}: ${response.status} ${detail}`,
      exitCode,
      hintForStatus(response.status),
      { code, status: response.status }
    );
  }

  return data as T;
};
