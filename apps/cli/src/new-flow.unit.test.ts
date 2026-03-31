import { describe, expect, it } from "vitest";

import {
  CANCEL_SCAFFOLD,
  CREATE_IN_SUBDIRECTORY,
  resolveDirectoryFromAction,
  resolveInitialDirectory,
  SCAFFOLD_CURRENT_DIRECTORY,
} from "./new-flow.js";

describe("resolveInitialDirectory", () => {
  it("keeps the explicit directory when provided", () => {
    expect(
      resolveInitialDirectory({
        currentDirectoryEntries: ["package.json"],
        directory: "guides",
        interactive: true,
      })
    ).toEqual({
      directory: "guides",
      kind: "target",
    });
  });

  it("defaults to docs for non-interactive runs without a directory", () => {
    expect(
      resolveInitialDirectory({
        currentDirectoryEntries: ["package.json"],
        interactive: false,
      })
    ).toEqual({
      directory: "docs",
      kind: "target",
    });
  });

  it("targets the current directory for interactive runs in an empty cwd", () => {
    expect(
      resolveInitialDirectory({
        currentDirectoryEntries: [],
        interactive: true,
      })
    ).toEqual({
      directory: ".",
      kind: "target",
    });
  });

  it("asks for location only when no directory was provided and cwd is not empty", () => {
    expect(
      resolveInitialDirectory({
        currentDirectoryEntries: ["package.json"],
        interactive: true,
      })
    ).toEqual({
      kind: "prompt",
    });
  });
});

describe("resolveDirectoryFromAction", () => {
  it("uses the current directory when requested", () => {
    expect(resolveDirectoryFromAction(SCAFFOLD_CURRENT_DIRECTORY)).toBe(".");
  });

  it("uses the provided subdirectory name", () => {
    expect(resolveDirectoryFromAction(CREATE_IN_SUBDIRECTORY, "guides")).toBe(
      "guides"
    );
  });

  it("defaults the subdirectory name to docs", () => {
    expect(resolveDirectoryFromAction(CREATE_IN_SUBDIRECTORY)).toBe("docs");
  });

  it("returns undefined when the flow is canceled", () => {
    expect(resolveDirectoryFromAction(CANCEL_SCAFFOLD)).toBeUndefined();
  });
});
