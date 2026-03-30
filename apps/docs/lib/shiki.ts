import { createHighlighter } from "shiki";

const COMMON_LANGS = [
  "bash",
  "css",
  "diff",
  "go",
  "graphql",
  "html",
  "javascript",
  "json",
  "jsx",
  "markdown",
  "mdx",
  "python",
  "rust",
  "sql",
  "tsx",
  "typescript",
  "yaml",
] as const;

const THEMES = ["github-dark", "github-light"] as const;

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

export const getHighlighter = () => {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      langs: [...COMMON_LANGS],
      themes: [...THEMES],
    });
  }
  return highlighterPromise;
};
