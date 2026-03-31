import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const MockTree = (_props: { children?: ReactNode }) => null;
const MockTreeFile = () => null;
const MockTreeFolder = (_props: { children?: ReactNode }) => null;

describe("mdxComponents", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("rebuilds Tree dotted subcomponents in the server MDX registry", async () => {
    vi.doMock("./tree", () => ({
      Tree: MockTree,
      TreeFile: MockTreeFile,
      TreeFolder: MockTreeFolder,
    }));

    const { mdxComponents } = await import("./index");
    const tree = mdxComponents.Tree as {
      File?: unknown;
      Folder?: unknown;
    };

    expect(tree.File).toBeDefined();
    expect(tree.Folder).toBeDefined();
  }, 10_000);
});
