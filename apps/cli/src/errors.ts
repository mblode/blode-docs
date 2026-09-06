export const EXIT_CODES = {
  AUTH_REQUIRED: 4,
  CANCELLED: 2,
  ERROR: 1,
  NETWORK: 5,
  SUCCESS: 0,
  VALIDATION: 3,
} as const;

type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

/**
 * Stable, machine-readable failure codes. An agent branches on these; the
 * message is for a human and may be reworded at any time.
 */
export const ERROR_CODES = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  CANCELLED: "CANCELLED",
  CONFIG_INVALID: "CONFIG_INVALID",
  ERROR: "ERROR",
  NETWORK: "NETWORK",
  NOT_FOUND: "NOT_FOUND",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  RATE_LIMITED: "RATE_LIMITED",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Default code for an exit code, so existing throw sites carry one for free. */
const CODE_BY_EXIT: Record<ExitCode, ErrorCode> = {
  [EXIT_CODES.AUTH_REQUIRED]: ERROR_CODES.AUTH_REQUIRED,
  [EXIT_CODES.CANCELLED]: ERROR_CODES.CANCELLED,
  [EXIT_CODES.ERROR]: ERROR_CODES.ERROR,
  [EXIT_CODES.NETWORK]: ERROR_CODES.NETWORK,
  [EXIT_CODES.SUCCESS]: ERROR_CODES.ERROR,
  [EXIT_CODES.VALIDATION]: ERROR_CODES.CONFIG_INVALID,
};

/** HTTP status to (code, exit code). Anything unlisted is a generic error. */
export const classifyHttpStatus = (
  status: number
): { code: ErrorCode; exitCode: ExitCode } => {
  if (status === 401 || status === 403) {
    return {
      code:
        status === 401
          ? ERROR_CODES.AUTH_REQUIRED
          : ERROR_CODES.PERMISSION_DENIED,
      exitCode: EXIT_CODES.AUTH_REQUIRED,
    };
  }
  if (status === 404) {
    return { code: ERROR_CODES.NOT_FOUND, exitCode: EXIT_CODES.ERROR };
  }
  if (status === 429) {
    return { code: ERROR_CODES.RATE_LIMITED, exitCode: EXIT_CODES.NETWORK };
  }
  if (status >= 500) {
    return { code: ERROR_CODES.SERVER_ERROR, exitCode: EXIT_CODES.NETWORK };
  }
  if (status >= 400) {
    return {
      code: ERROR_CODES.CONFIG_INVALID,
      exitCode: EXIT_CODES.VALIDATION,
    };
  }
  return { code: ERROR_CODES.ERROR, exitCode: EXIT_CODES.ERROR };
};

export class CliError extends Error {
  readonly exitCode: ExitCode;
  readonly hint: string | null;
  /** Stable identifier for programmatic callers. */
  readonly code: ErrorCode;
  /** HTTP status when the failure came from the API. */
  readonly status: number | null;

  constructor(
    message: string,
    exitCode: ExitCode = EXIT_CODES.ERROR,
    hint?: string,
    options?: { code?: ErrorCode; status?: number }
  ) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
    this.hint = hint ?? null;
    this.code = options?.code ?? CODE_BY_EXIT[exitCode];
    this.status = options?.status ?? null;
  }
}

export const toCliError = (error: unknown): CliError => {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof Error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return new CliError(
        "Cannot connect to Blode.md API.",
        EXIT_CODES.NETWORK,
        "Check your internet connection and API URL configuration.",
        { code: ERROR_CODES.NETWORK }
      );
    }

    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return new CliError(
        "Request timed out.",
        EXIT_CODES.NETWORK,
        "The API may be unavailable. Try again later."
      );
    }

    if (/\b401\b/.test(error.message)) {
      return new CliError(
        error.message,
        EXIT_CODES.AUTH_REQUIRED,
        'Check your API key or run "blodemd login".'
      );
    }

    return new CliError(error.message, EXIT_CODES.ERROR);
  }

  return new CliError("Unknown error", EXIT_CODES.ERROR);
};
