import { CliError, EXIT_CODES } from "./errors.js";

const MAX_PORT = 65_535;

export const parsePositiveInteger = (value: string, label: string): number => {
  const trimmed = value.trim();

  if (!/^\d+$/u.test(trimmed)) {
    throw new CliError(
      `${label} must be a positive integer.`,
      EXIT_CODES.VALIDATION
    );
  }

  const parsed = Number(trimmed);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new CliError(
      `${label} must be a positive integer.`,
      EXIT_CODES.VALIDATION
    );
  }

  return parsed;
};

export const parsePort = (value: string, label = "Port"): number => {
  const parsed = parsePositiveInteger(value, label);

  if (parsed > MAX_PORT) {
    throw new CliError(
      `${label} must be between 1 and ${MAX_PORT}.`,
      EXIT_CODES.VALIDATION
    );
  }

  return parsed;
};
