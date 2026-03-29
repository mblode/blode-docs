export const EXIT_CODES = {
  AUTH_REQUIRED: 4,
  CANCELLED: 2,
  ERROR: 1,
  NETWORK: 5,
  SUCCESS: 0,
  VALIDATION: 3,
} as const;

type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

export class CliError extends Error {
  readonly exitCode: ExitCode;
  readonly hint: string | null;

  constructor(
    message: string,
    exitCode: ExitCode = EXIT_CODES.ERROR,
    hint?: string
  ) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
    this.hint = hint ?? null;
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
        "Check your internet connection and API URL configuration."
      );
    }

    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return new CliError(
        "Request timed out.",
        EXIT_CODES.NETWORK,
        "The API may be unavailable. Try again later."
      );
    }

    return new CliError(error.message, EXIT_CODES.ERROR);
  }

  return new CliError("Unknown error", EXIT_CODES.ERROR);
};
