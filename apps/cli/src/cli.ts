import { Command } from "commander";

import { registerAnalyticsCommand } from "./analytics/command.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerDevCommand } from "./commands/dev.js";
import { registerNewCommand } from "./commands/new.js";
import { registerProjectsCommand } from "./commands/projects.js";
import { registerPushCommand } from "./commands/push.js";
import { registerSchemaCommand } from "./commands/schema.js";
import { registerValidateCommand } from "./commands/validate.js";
import { toCliError } from "./errors.js";
import { assertSupportedNodeVersion, readCliVersion } from "./runtime.js";

const program = new Command();
const cliVersion = readCliVersion(import.meta.url);

program.name("blodemd").description("Blode.md CLI").version(cliVersion);
program.hook("preAction", () => {
  assertSupportedNodeVersion();
});

registerAuthCommands(program);
registerNewCommand(program);
registerValidateCommand(program);
registerPushCommand(program);
registerProjectsCommand(program);
registerDevCommand(program);
registerAnalyticsCommand(program);
registerSchemaCommand(program);

program.addHelpText(
  "after",
  `
Example:
  $ blodemd push ./docs --project my-docs

Environment:
  BLODEMD_API_KEY     API key, used ahead of a stored login session
  BLODEMD_PROJECT     Default --project slug
  BLODEMD_API_URL     API origin (defaults to the hosted API)

Exit codes:
  0  success
  1  error
  2  cancelled
  3  invalid input or config
  4  authentication required
  5  network failure
`
);

// Top-level boundary: turn any thrown CliError (or wrapped error) into a clean
// stderr message plus exit code instead of a raw stack trace.
try {
  await program.parseAsync();
} catch (error) {
  const cliError = toCliError(error);
  console.error(cliError.message);
  if (cliError.hint) {
    console.error(cliError.hint);
  }
  process.exitCode = cliError.exitCode;
}
