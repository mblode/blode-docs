const UNIQUE_VIOLATION = "23505";

export const isUniqueViolationError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === UNIQUE_VIOLATION;
