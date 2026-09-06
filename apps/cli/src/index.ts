/**
 * Public entry for scripts that shell out to the CLI: the exit codes and the
 * error codes a `--json` failure envelope carries, so a caller can branch on a
 * constant instead of a hardcoded number or string.
 */
export { ERROR_CODES, EXIT_CODES } from "./errors.js";
export type { ErrorCode } from "./errors.js";
export type { DeploymentResponse } from "./types.js";
