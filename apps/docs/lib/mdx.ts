import { compileMDX } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrism from "rehype-prism-plus";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { mdxComponents } from "@/components/mdx";

export const renderMdx = async (source: string) =>
  await compileMDX({
    components: mdxComponents,
    options: {
      mdxOptions: {
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "append",
              properties: { className: ["heading-anchor"] },
            },
          ],
          rehypePrism,
        ],
        remarkPlugins: [remarkGfm],
      },
      parseFrontmatter: true,
    },
    source,
  });
