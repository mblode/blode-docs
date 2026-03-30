import { createRequire } from "node:module";

import { evaluate } from "@mdx-js/mdx";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { createElement } from "react";
import type { ComponentType } from "react";
import type * as JsxDevRuntimeModule from "react/jsx-dev-runtime";
import type * as JsxRuntimeModule from "react/jsx-runtime";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { mdxComponents } from "@/components/mdx";

import { getHighlighter } from "./shiki";

const FRONTMATTER_REGEX = /^---\s*\n[\s\S]*?\n---\s*\n?/;
const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";
const require = createRequire(import.meta.url);
const jsxDevRuntime =
  require("react/jsx-dev-runtime") as typeof JsxDevRuntimeModule;
const jsxRuntime = require("react/jsx-runtime") as typeof JsxRuntimeModule;

const stripFrontmatter = (source: string) => ({
  body: source.replace(FRONTMATTER_REGEX, ""),
  frontmatter: {} as Record<string, unknown>,
});

export const renderMdx = async (source: string) => {
  const { body, frontmatter } = stripFrontmatter(source);
  const highlighter = await getHighlighter();
  const shikiTransformer = rehypeShikiFromHighlighter(highlighter, {
    themes: {
      dark: "github-dark",
      light: "github-light",
    },
  });
  const shikiPlugin = () => shikiTransformer;

  const runtime = IS_DEVELOPMENT ? jsxDevRuntime : jsxRuntime;
  const evaluated = await evaluate(body, {
    ...runtime,
    development: IS_DEVELOPMENT,
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          properties: {
            className: [
              "ml-2 text-[0.9em] opacity-0 transition-opacity hover:opacity-100",
            ],
          },
        },
      ],
      shikiPlugin,
    ],
    remarkPlugins: [remarkGfm],
  });

  const Content = evaluated.default as ComponentType<{
    components?: typeof mdxComponents;
  }>;

  return {
    content: createElement(Content, { components: mdxComponents }),
    frontmatter,
  };
};
