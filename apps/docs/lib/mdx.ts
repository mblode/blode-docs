import { run } from "@mdx-js/mdx";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { compileMDX } from "next-mdx-remote/rsc";
import { createElement } from "react";
import type { ComponentType } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { mdxComponents } from "@/components/mdx";

import { getHighlighter } from "./shiki";

const FRONTMATTER_REGEX = /^---\s*\n[\s\S]*?\n---\s*\n?/;

const stripFrontmatter = (source: string) => ({
  body: source.replace(FRONTMATTER_REGEX, ""),
  frontmatter: {} as Record<string, unknown>,
});

/**
 * Renders pre-compiled MDX content. The `compiledSource` is a JS function body
 * produced by `@repo/mdx-compiler` at deploy time via `compile()` with
 * `outputFormat: 'function-body'`. This is the fast path — no parsing,
 * no plugin execution, no Shiki. Sub-millisecond execution.
 */
export const renderFromCompiled = async (compiledSource: string) => {
  const mdxModule = await run(compiledSource, {
    ...jsxRuntime,
    baseUrl: import.meta.url,
  });
  const Content = mdxModule.default as ComponentType<{
    components?: typeof mdxComponents;
  }>;

  return {
    content: createElement(Content, { components: mdxComponents }),
    frontmatter: {} as Record<string, unknown>,
  };
};

/**
 * Full MDX compilation + rendering. Used as fallback for local development
 * (FsContentSource) and any content that wasn't pre-compiled at deploy time.
 */
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

  const result = await compileMDX({
    components: mdxComponents,
    options: {
      blockDangerousJS: false,
      blockJS: false,
      mdxOptions: {
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
      },
    },
    source: body,
  });

  return {
    content: result.content,
    frontmatter,
  };
};
