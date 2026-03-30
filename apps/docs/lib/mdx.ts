import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { mdxComponents } from "@/components/mdx";

import { getHighlighter } from "./shiki";

export const renderMdx = async (source: string) => {
  const highlighter = await getHighlighter();
  const shikiPlugin = rehypeShikiFromHighlighter(highlighter, {
    themes: {
      dark: "github-dark",
      light: "github-light",
    },
  });

  return await compileMDX({
    components: mdxComponents,
    options: {
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
          // @ts-expect-error -- rehypeShikiFromHighlighter returns a Transformer, compatible with rehype plugins
          shikiPlugin,
        ],
        remarkPlugins: [remarkGfm],
      },
      parseFrontmatter: true,
    },
    source,
  });
};
