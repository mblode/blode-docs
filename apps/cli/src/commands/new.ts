import fs from "node:fs/promises";
import path from "node:path";

import { confirm, intro, isCancel, log, select, text } from "@clack/prompts";
import chalk from "chalk";
import type { Command } from "commander";

import {
  parseProjectSlug,
  parseScaffoldTemplate,
  reportCommandError,
} from "../command-utils.js";
import { EXIT_CODES } from "../errors.js";
import {
  findExistingPaths,
  writeFileIfMissing,
  writeSymlinkIfMissing,
} from "../fs-utils.js";
import {
  CANCEL_SCAFFOLD,
  CREATE_IN_SUBDIRECTORY,
  resolveDirectoryFromAction,
  resolveInitialDirectory,
  SCAFFOLD_CURRENT_DIRECTORY,
} from "../new-flow.js";
import type { NoArgInteractiveAction } from "../new-flow.js";
import {
  deriveDisplayNameFromProjectSlug,
  validateProjectSlug,
} from "../project-config.js";
import {
  DEFAULT_SCAFFOLD_DIRECTORY,
  deriveDefaultProjectSlug,
  getScaffoldFiles,
  resolveScaffoldDirectory,
  SCAFFOLD_TEMPLATES,
} from "../scaffold.js";
import type { ScaffoldTemplate } from "../scaffold.js";

const isInteractiveTerminal = () =>
  process.stdin.isTTY === true && process.stdout.isTTY === true;

/**
 * Every cancel path exits non-zero (EXIT_CODES.CANCELLED) so a CI gate or an
 * agent cannot read a declined scaffold as a successful one.
 */
const reportCancelled = (): void => {
  process.exitCode = EXIT_CODES.CANCELLED;
  log.warn("Cancelled");
};

const promptForNoArgDirectoryAction = async (): Promise<
  NoArgInteractiveAction | undefined
> => {
  const directoryAction = await select<NoArgInteractiveAction>({
    initialValue: CREATE_IN_SUBDIRECTORY,
    message: "Directory . is not empty. What would you like to do?",
    options: [
      {
        hint: "recommended",
        label: "Create in a subdirectory",
        value: CREATE_IN_SUBDIRECTORY,
      },
      {
        hint: "scaffold here",
        label: "Scaffold current directory",
        value: SCAFFOLD_CURRENT_DIRECTORY,
      },
      {
        label: "Cancel",
        value: CANCEL_SCAFFOLD,
      },
    ],
  });

  if (isCancel(directoryAction)) {
    return;
  }

  return directoryAction;
};

const promptForSubdirectoryName = async (): Promise<string | undefined> => {
  const subdirectory = await text({
    initialValue: DEFAULT_SCAFFOLD_DIRECTORY,
    message: "Subdirectory name",
    placeholder: DEFAULT_SCAFFOLD_DIRECTORY,
    validate: (value) => {
      if (!value?.trim()) {
        return "Subdirectory name is required.";
      }
    },
  });

  if (isCancel(subdirectory)) {
    return;
  }

  return subdirectory.trim();
};

const promptForProjectSlug = async (
  initialValue: string
): Promise<string | undefined> => {
  const projectSlug = await text({
    initialValue,
    message: "Project slug",
    placeholder: initialValue,
    validate: validateProjectSlug,
  });

  if (isCancel(projectSlug)) {
    return;
  }

  return projectSlug.trim();
};

const promptForDisplayName = async (
  initialValue: string
): Promise<string | undefined> => {
  const displayName = await text({
    initialValue,
    message: "Display name",
    placeholder: initialValue,
    validate: (value) => {
      if (!value?.trim()) {
        return "Display name is required.";
      }
    },
  });

  if (isCancel(displayName)) {
    return;
  }

  return displayName.trim();
};

const resolveRequestedDirectory = async (
  directory: string | undefined,
  shouldPrompt: boolean
): Promise<
  | {
      directory: string;
      skipNonEmptyConfirmation?: boolean;
    }
  | undefined
> => {
  let currentDirectoryEntries: string[] = [];

  if (!directory && shouldPrompt) {
    currentDirectoryEntries = await fs.readdir(process.cwd());
  }

  const initialResolution = resolveInitialDirectory({
    currentDirectoryEntries,
    directory,
    interactive: shouldPrompt,
  });

  if (initialResolution.kind === "target") {
    return { directory: initialResolution.directory };
  }

  const directoryAction = await promptForNoArgDirectoryAction();

  if (!directoryAction || directoryAction === CANCEL_SCAFFOLD) {
    return;
  }

  const subdirectory =
    directoryAction === CREATE_IN_SUBDIRECTORY
      ? await promptForSubdirectoryName()
      : undefined;
  const resolvedDirectory = resolveDirectoryFromAction(
    directoryAction,
    subdirectory
  );

  if (!resolvedDirectory) {
    return;
  }

  return {
    directory: resolvedDirectory,
    skipNonEmptyConfirmation: directoryAction === SCAFFOLD_CURRENT_DIRECTORY,
  };
};

const confirmScaffoldTarget = async (
  root: string,
  template: ScaffoldTemplate,
  shouldPrompt: boolean,
  options?: {
    skipNonEmptyConfirmation?: boolean;
  }
): Promise<boolean> => {
  const existingTarget = await fs.lstat(root).catch(() => null);

  if (existingTarget && !existingTarget.isDirectory()) {
    throw new Error(
      `Target path already exists and is not a directory: ${root}`
    );
  }

  if (!existingTarget?.isDirectory()) {
    return true;
  }

  const existingScaffoldPaths = await findExistingPaths(
    root,
    getScaffoldFiles(template).map((file) => file.path)
  );

  if (existingScaffoldPaths.length > 0) {
    throw new Error(
      `Target directory already contains scaffold files: ${existingScaffoldPaths.join(", ")}. Use a different directory or remove those files first.`
    );
  }

  const directoryEntries = await fs.readdir(root);
  const existingEntries = directoryEntries.toSorted((left, right) =>
    left.localeCompare(right)
  );

  if (existingEntries.length === 0) {
    return true;
  }

  if (options?.skipNonEmptyConfirmation) {
    return true;
  }

  if (!shouldPrompt) {
    throw new Error(
      `Target directory is not empty: ${root}. Choose an empty directory or run this command in an interactive terminal to confirm scaffolding there.`
    );
  }

  const shouldContinue = await confirm({
    message: `Scaffold into the non-empty directory ${root}? Existing files will be left untouched.`,
  });

  return !isCancel(shouldContinue) && shouldContinue;
};

const resolveProjectSlug = async (
  providedSlug: string | undefined,
  directory: string,
  shouldPrompt: boolean
): Promise<string | undefined> => {
  const defaultProjectSlug = deriveDefaultProjectSlug(directory, process.cwd());

  if (providedSlug) {
    return providedSlug;
  }

  if (!shouldPrompt) {
    return defaultProjectSlug;
  }

  return await promptForProjectSlug(defaultProjectSlug);
};

const resolveDisplayName = async (
  providedDisplayName: string | undefined,
  projectSlug: string,
  shouldPrompt: boolean
): Promise<string | undefined> => {
  const defaultDisplayName = deriveDisplayNameFromProjectSlug(projectSlug);

  if (providedDisplayName?.trim()) {
    return providedDisplayName.trim();
  }

  if (!shouldPrompt) {
    return defaultDisplayName;
  }

  return await promptForDisplayName(defaultDisplayName);
};

const writeScaffoldFiles = async (
  root: string,
  template: ScaffoldTemplate,
  options: {
    displayName: string;
    projectSlug: string;
  }
) => {
  for (const file of getScaffoldFiles(template, options)) {
    const filePath = path.join(root, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    if (file.type === "symlink") {
      await writeSymlinkIfMissing(filePath, file.target, {
        fallbackContent: file.fallbackContent,
      });
      continue;
    }

    await writeFileIfMissing(filePath, file.content);
  }
};

const scaffoldDocsSite = async (
  directory: string | undefined,
  options?: {
    deprecatedCommand?: string;
    displayName?: string;
    name?: string;
    slug?: string;
    template?: ScaffoldTemplate;
    yes?: boolean;
  }
) => {
  intro(chalk.bold("blodemd new"));

  if (options?.deprecatedCommand) {
    log.warn(
      `"${options.deprecatedCommand}" is deprecated. Use ${chalk.cyan("blodemd new")} instead.`
    );
  }
  if (options?.name && !options.slug) {
    log.warn(
      `"${chalk.cyan("--name")}" is deprecated. Use ${chalk.cyan("--slug")} instead.`
    );
  }

  try {
    const template = options?.template ?? "minimal";
    const shouldPrompt = isInteractiveTerminal() && !options?.yes;
    const selectedDirectory = await resolveRequestedDirectory(
      directory,
      shouldPrompt
    );

    if (!selectedDirectory) {
      reportCancelled();
      return;
    }

    const resolvedDirectory = resolveScaffoldDirectory(
      selectedDirectory.directory
    );
    const root = path.resolve(process.cwd(), resolvedDirectory);

    if (
      !(await confirmScaffoldTarget(root, template, shouldPrompt, {
        skipNonEmptyConfirmation: selectedDirectory.skipNonEmptyConfirmation,
      }))
    ) {
      reportCancelled();
      return;
    }

    const projectSlug = await resolveProjectSlug(
      options?.slug ?? options?.name,
      resolvedDirectory,
      shouldPrompt
    );

    if (!projectSlug) {
      reportCancelled();
      return;
    }

    const displayName = await resolveDisplayName(
      options?.displayName,
      projectSlug,
      shouldPrompt
    );

    if (!displayName) {
      reportCancelled();
      return;
    }

    await fs.mkdir(root, { recursive: true });
    await writeScaffoldFiles(root, template, { displayName, projectSlug });

    log.success(`Docs scaffolded in ${chalk.cyan(root)}`);
    if (template === "starter") {
      log.info("Starter template includes brand assets and helper files.");
    }
    log.info(`Display name: ${chalk.cyan(displayName)}`);
    log.info(`Project slug: ${chalk.cyan(projectSlug)}`);
    log.info("Done");
  } catch (error: unknown) {
    reportCommandError("New failed", error);
  }
};

export const registerNewCommand = (program: Command): void => {
  program
    .command("new")
    .description("Create a new blode.md documentation site")
    .argument("[directory]", "target directory")
    .option("--slug <slug>", "project slug for docs.json", parseProjectSlug)
    .option("--name <slug>", "deprecated alias for --slug", parseProjectSlug)
    .option("--display-name <name>", "display name for docs.json")
    .option(
      "-t, --template <template>",
      `scaffold template (${SCAFFOLD_TEMPLATES.join(", ")})`,
      parseScaffoldTemplate,
      "minimal"
    )
    .option("-y, --yes", "accept defaults without prompting")
    .action(
      async (
        directory: string | undefined,
        options: {
          displayName?: string;
          name?: string;
          slug?: string;
          template: ScaffoldTemplate;
          yes?: boolean;
        }
      ) => {
        await scaffoldDocsSite(directory, {
          displayName: options.displayName,
          name: options.name,
          slug: options.slug ?? options.name,
          template: options.template,
          yes: options.yes,
        });
      }
    );

  program
    .command("init", { hidden: true })
    .argument("[directory]", "target directory")
    .option("--slug <slug>", "project slug for docs.json", parseProjectSlug)
    .option("--name <slug>", "deprecated alias for --slug", parseProjectSlug)
    .option("--display-name <name>", "display name for docs.json")
    .option(
      "-t, --template <template>",
      `scaffold template (${SCAFFOLD_TEMPLATES.join(", ")})`,
      parseScaffoldTemplate,
      "minimal"
    )
    .option("-y, --yes", "accept defaults without prompting")
    .action(
      async (
        directory: string | undefined,
        options: {
          displayName?: string;
          name?: string;
          slug?: string;
          template: ScaffoldTemplate;
          yes?: boolean;
        }
      ) => {
        await scaffoldDocsSite(directory, {
          deprecatedCommand: "blodemd init",
          displayName: options.displayName,
          name: options.name,
          slug: options.slug ?? options.name,
          template: options.template,
          yes: options.yes,
        });
      }
    );
};
