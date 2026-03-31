import { compile } from "@mdx-js/mdx";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { getHighlighter, SHIKI_THEME_PAIR } from "./shiki.js";

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

export interface CompiledMdx {
  compiledSource: string;
  version: 1;
}

/**
 * Compiles MDX source to a JavaScript function body string.
 * The output can be executed at runtime via `run()` from `@mdx-js/mdx`
 * without any further compilation — just JSX runtime binding.
 *
 * Syntax highlighting (Shiki), heading anchors, and GFM are baked into
 * the compiled output, so runtime only needs React + custom components.
 */
export const compileContent = async (source: string): Promise<CompiledMdx> => {
  const body = source.replace(FRONTMATTER_REGEX, "");
  const highlighter = await getHighlighter();
  const shikiTransformer = rehypeShikiFromHighlighter(highlighter, {
    defaultColor: false,
    themes: SHIKI_THEME_PAIR,
  });
  const shikiPlugin = () => shikiTransformer;

  const compiled = await compile(body, {
    development: false,
    outputFormat: "function-body",
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

  return {
    compiledSource: String(compiled),
    version: 1,
  };
};
