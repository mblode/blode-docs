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

export const SHIKI_THEME_PAIR = {
  dark: "github-dark",
  light: "github-light",
} as const;

const THEMES = [SHIKI_THEME_PAIR.dark, SHIKI_THEME_PAIR.light] as const;

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
