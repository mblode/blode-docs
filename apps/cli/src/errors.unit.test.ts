import { describe, expect, it } from "vitest";

import {
  classifyHttpStatus,
  CliError,
  ERROR_CODES,
  EXIT_CODES,
  toCliError,
} from "./errors.js";

describe("toCliError", () => {
  it("maps a 401 response error to AUTH_REQUIRED with a hint", () => {
    const error = new Error("Failed to create deployment: 401 Unauthorized");
    const cliError = toCliError(error);

    expect(cliError).toBeInstanceOf(CliError);
    expect(cliError.exitCode).toBe(EXIT_CODES.AUTH_REQUIRED);
    expect(cliError.hint).toBe('Check your API key or run "blodemd login".');
    expect(cliError.message).toBe(error.message);
  });

  it("does not treat unrelated numbers as a 401", () => {
    const cliError = toCliError(new Error("Uploaded 4014 files"));

    expect(cliError.exitCode).toBe(EXIT_CODES.ERROR);
    expect(cliError.hint).toBeNull();
  });

  it("passes CliError instances through unchanged", () => {
    const original = new CliError("boom", EXIT_CODES.VALIDATION, "fix it");
    expect(toCliError(original)).toBe(original);
  });
});

describe("CliError codes", () => {
  it("derives a stable code from the exit code", () => {
    expect(new CliError("boom").code).toBe(ERROR_CODES.ERROR);
    expect(new CliError("boom", EXIT_CODES.VALIDATION).code).toBe(
      ERROR_CODES.CONFIG_INVALID
    );
    expect(new CliError("boom", EXIT_CODES.CANCELLED).code).toBe(
      ERROR_CODES.CANCELLED
    );
  });

  it("lets a caller override the code and carry a status", () => {
    const error = new CliError("nope", EXIT_CODES.ERROR, undefined, {
      code: ERROR_CODES.NOT_FOUND,
      status: 404,
    });

    expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(error.status).toBe(404);
  });

  it("defaults status to null so callers can branch on it", () => {
    expect(new CliError("boom").status).toBeNull();
  });
});

describe("classifyHttpStatus", () => {
  it.each([
    [401, ERROR_CODES.AUTH_REQUIRED, EXIT_CODES.AUTH_REQUIRED],
    [403, ERROR_CODES.PERMISSION_DENIED, EXIT_CODES.AUTH_REQUIRED],
    [404, ERROR_CODES.NOT_FOUND, EXIT_CODES.ERROR],
    [429, ERROR_CODES.RATE_LIMITED, EXIT_CODES.NETWORK],
    [503, ERROR_CODES.SERVER_ERROR, EXIT_CODES.NETWORK],
    [422, ERROR_CODES.CONFIG_INVALID, EXIT_CODES.VALIDATION],
  ])("maps %i to %s", (status, code, exitCode) => {
    expect(classifyHttpStatus(status)).toEqual({ code, exitCode });
  });
});
