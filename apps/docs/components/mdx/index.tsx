import type { MDXComponents } from "mdx/types";
import Link from "next/link";

import { Callout } from "./callout";
import { CodeBlock } from "./code-block";
import { Installer } from "./installer";
import { Preview } from "./preview";
import { Tab, Tabs } from "./tabs";
import { TypeTable } from "./type-table";
import { Video } from "./video";

const MdxLink = ({
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  if (!href) {
    return <a {...props} />;
  }
  const isExternal = href.startsWith("http");
  if (isExternal) {
    return (
      <a {...props} href={href} rel="noopener noreferrer" target="_blank" />
    );
  }
  return <Link href={href} {...props} />;
};

export const mdxComponents: MDXComponents = {
  Callout,
  Installer,
  Preview,
  Tab,
  Tabs,
  TypeTable,
  Video,
  a: MdxLink,
  pre: CodeBlock,
};
