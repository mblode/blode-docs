import { describe, expect, it } from "vitest";

import {
  deriveDefaultProjectSlug,
  getScaffoldFiles,
  isScaffoldTemplate,
  validateProjectSlug,
} from "./scaffold.js";

const getFileContent = (
  files: ReturnType<typeof getScaffoldFiles>,
  filePath: string
): string => {
  const file = files.find((candidate) => candidate.path === filePath);
  return file && "content" in file ? file.content : "";
};

describe("scaffold templates", () => {
  it("recognizes supported scaffold templates", () => {
    expect(isScaffoldTemplate("minimal")).toBe(true);
    expect(isScaffoldTemplate("starter")).toBe(true);
    expect(isScaffoldTemplate("full")).toBe(false);
  });

  it("returns the minimal scaffold by default", () => {
    const files = getScaffoldFiles("minimal");
    const [docsJsonFile] = files;

    expect(files.map((file) => file.path)).toEqual(["docs.json", "index.mdx"]);
    expect(
      docsJsonFile && "content" in docsJsonFile ? docsJsonFile.content : ""
    ).toContain('"name": "my-project"');
  });

  it("returns the starter scaffold with assets and helper files", () => {
    const files = getScaffoldFiles("starter");
    const filePaths = files.map((file) => file.path);
    const agentsFile = files.find((file) => file.path === "AGENTS.md");
    const claudeContent = getFileContent(files, "CLAUDE.md");
    const docsJsonContent = getFileContent(files, "docs.json");
    const gitIgnoreContent = getFileContent(files, ".gitignore");
    const indexContent = getFileContent(files, "index.mdx");
    const readmeContent = getFileContent(files, "README.md");

    expect(filePaths).toEqual(
      expect.arrayContaining([
        "docs.json",
        "index.mdx",
        "quickstart.mdx",
        "development.mdx",
        "README.md",
        "AGENTS.md",
        "CLAUDE.md",
        ".gitignore",
        "favicon.svg",
        "logo/light.svg",
        "logo/dark.svg",
        "images/hero-light.svg",
        "images/hero-dark.svg",
        "images/checks-passed.svg",
      ])
    );
    expect(filePaths).not.toContain("LICENSE");
    expect(docsJsonContent).toContain('"favicon": "/favicon.svg"');
    expect(docsJsonContent).toContain(
      '"$schema": "https://blode.md/docs.json"'
    );
    expect(docsJsonContent).toContain('"light": "/logo/light.svg"');
    expect(docsJsonContent).toContain('"alt": "my-project logo"');
    expect(docsJsonContent).not.toContain('"theme"');
    expect(docsJsonContent).not.toContain('"colors"');
    expect(indexContent).toContain(
      "![Starter illustration](images/hero-light.svg)"
    );
    expect(gitIgnoreContent).toContain(".env*");
    expect(agentsFile).toMatchObject({
      path: "AGENTS.md",
      target: "CLAUDE.md",
      type: "symlink",
    });
    expect(claudeContent).toContain("Customize this file for your project");
    expect(readmeContent).toContain("Add a `LICENSE` file deliberately");
  });

  it("personalizes scaffolded files with the provided project slug", () => {
    const files = getScaffoldFiles("starter", { projectSlug: "acme-docs" });
    const docsJsonContent = getFileContent(files, "docs.json");
    const lightLogoContent = getFileContent(files, "logo/light.svg");

    expect(docsJsonContent).toContain('"name": "acme-docs"');
    expect(lightLogoContent).toContain(">acme-docs</text>");
  });
});

describe("deriveDefaultProjectSlug", () => {
  it("uses the current directory name for the default docs directory", () => {
    expect(deriveDefaultProjectSlug(undefined, "/Users/mblode/Code/acme")).toBe(
      "acme"
    );
    expect(deriveDefaultProjectSlug("docs", "/Users/mblode/Code/acme")).toBe(
      "acme"
    );
    expect(deriveDefaultProjectSlug(".", "/Users/mblode/Code/acme")).toBe(
      "acme"
    );
  });

  it("uses the target directory name for custom paths", () => {
    expect(
      deriveDefaultProjectSlug("customer-portal", "/Users/mblode/Code/acme")
    ).toBe("customer-portal");
  });
});

describe("validateProjectSlug", () => {
  it("accepts lowercase slugs", () => {
    expect(validateProjectSlug("acme-docs")).toBeUndefined();
  });

  it("rejects values that are not already slug-safe", () => {
    expect(validateProjectSlug("Acme Docs")).toBe(
      'Use lowercase letters, numbers, and hyphens. Try "acme-docs".'
    );
  });
});
