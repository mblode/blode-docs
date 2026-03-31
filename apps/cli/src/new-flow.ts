import { DEFAULT_SCAFFOLD_DIRECTORY } from "./scaffold.js";

export const CREATE_IN_SUBDIRECTORY = "create-in-subdirectory";
export const SCAFFOLD_CURRENT_DIRECTORY = "scaffold-current-directory";
export const CANCEL_SCAFFOLD = "cancel";

export type NoArgInteractiveAction =
  | typeof CREATE_IN_SUBDIRECTORY
  | typeof SCAFFOLD_CURRENT_DIRECTORY
  | typeof CANCEL_SCAFFOLD;

export type InitialDirectoryResolution =
  | {
      directory: string;
      kind: "target";
    }
  | {
      kind: "prompt";
    };

export const resolveInitialDirectory = (options: {
  currentDirectoryEntries: readonly string[];
  directory?: string;
  interactive: boolean;
}): InitialDirectoryResolution => {
  if (options.directory) {
    return { directory: options.directory, kind: "target" };
  }

  if (!options.interactive) {
    return { directory: DEFAULT_SCAFFOLD_DIRECTORY, kind: "target" };
  }

  if (options.currentDirectoryEntries.length === 0) {
    return { directory: ".", kind: "target" };
  }

  return { kind: "prompt" };
};

export const resolveDirectoryFromAction = (
  action: NoArgInteractiveAction,
  subdirectory?: string
): string | undefined => {
  if (action === SCAFFOLD_CURRENT_DIRECTORY) {
    return ".";
  }

  if (action === CREATE_IN_SUBDIRECTORY) {
    return subdirectory?.trim() || DEFAULT_SCAFFOLD_DIRECTORY;
  }
};
