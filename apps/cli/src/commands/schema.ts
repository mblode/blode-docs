import type { Command, Option } from "commander";

import { ERROR_CODES, EXIT_CODES } from "../errors.js";

interface OptionSchema {
  flags: string;
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

interface CommandSchema {
  name: string;
  description: string;
  usage: string;
  arguments: { name: string; description: string; required: boolean }[];
  options: OptionSchema[];
  subcommands: CommandSchema[];
}

const describeOption = (option: Option): OptionSchema => ({
  description: option.description,
  flags: option.flags,
  required: option.required === true,
  ...(option.defaultValue === undefined
    ? {}
    : { defaultValue: option.defaultValue }),
});

/**
 * Walks the live commander tree rather than a hand-written list, so the schema
 * cannot drift from the commands that actually exist.
 */
const describeCommand = (command: Command): CommandSchema => ({
  arguments: command.registeredArguments.map((argument) => ({
    description: argument.description,
    name: argument.name(),
    required: argument.required,
  })),
  description: command.description(),
  name: command.name(),
  options: command.options.map(describeOption),
  subcommands: command.commands.map((child) =>
    describeCommand(child as Command)
  ),
  usage: command.usage(),
});

export const registerSchemaCommand = (program: Command): void => {
  program
    .command("schema")
    .description("Print the CLI contract as JSON, for scripts and agents")
    .action(() => {
      // Always JSON on stdout: this command exists only for machine callers,
      // so there is no interactive variant to fall back to.
      process.stdout.write(
        `${JSON.stringify({
          commands: program.commands
            .filter((child) => child.name() !== "help")
            .map((child) => describeCommand(child as Command)),
          errorCodes: ERROR_CODES,
          exitCodes: EXIT_CODES,
          name: program.name(),
          version: program.version(),
        })}\n`
      );
    });
};
