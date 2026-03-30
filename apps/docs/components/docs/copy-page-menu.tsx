"use client";

import { Menu } from "@base-ui/react/menu";
import {
  Checkmark1Icon,
  ChevronDownSmallIcon,
  ClaudeaiIcon,
  CopySimpleIcon,
  OpenaiIcon,
} from "blode-icons-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface CopyPageMenuProps {
  content?: string;
  contentUrl?: string;
  title: string;
}

const MenuIcon = ({ children }: { children: React.ReactNode }) => (
  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border">
    {children}
  </div>
);

const MenuLink = ({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) => (
  <Menu.Item
    className="flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-secondary/25"
    render={
      <a href={href} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    }
  />
);

const ExternalArrow = () => (
  <svg
    aria-hidden="true"
    className="ml-1 inline-block size-3"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path d="M7 17L17 7M7 7h10v10" />
  </svg>
);

const formatMarkdownForCopy = (source: string, title: string) => {
  const trimmed = source.trimStart();
  if (trimmed.startsWith("#")) {
    return source;
  }
  return `# ${title}\n\n${source}`;
};

export const CopyPageMenu = ({
  content,
  contentUrl,
  title,
}: CopyPageMenuProps) => {
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [resolvedContent, setResolvedContent] = useState(content ?? "");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (content !== undefined) {
      setResolvedContent(content);
    }
  }, [content]);

  const getContent = useCallback(async () => {
    if (resolvedContent) {
      return resolvedContent;
    }

    if (!contentUrl) {
      return "";
    }

    const response = await fetch(contentUrl, {
      headers: {
        accept: "text/markdown,text/plain;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to load page markdown: ${response.status}`);
    }

    const nextContent = await response.text();
    setResolvedContent(nextContent);
    return nextContent;
  }, [contentUrl, resolvedContent]);

  const handleCopy = useCallback(async () => {
    const nextContent = await getContent();
    const markdown = formatMarkdownForCopy(nextContent, title);
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getContent, title]);

  const chatgptUrl = pageUrl
    ? `https://chatgpt.com/?hints=search&q=${encodeURIComponent(`Read from ${pageUrl} so I can ask questions about it.`)}`
    : "#";
  const claudeUrl = pageUrl
    ? `https://claude.ai/new?q=${encodeURIComponent(`Read from ${pageUrl} so I can ask questions about it.`)}`
    : "#";

  return (
    <div className="flex shrink-0 items-center">
      <button
        className="inline-flex items-center gap-2 rounded-l-xl border border-r-0 border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary/25"
        onClick={handleCopy}
        type="button"
      >
        {copied ? (
          <Checkmark1Icon aria-hidden="true" className="size-[18px]" />
        ) : (
          <CopySimpleIcon aria-hidden="true" className="size-[18px]" />
        )}
        <span>{copied ? "Copied" : "Copy page"}</span>
      </button>

      <Menu.Root>
        <Menu.Trigger
          aria-label="More actions"
          className="inline-flex items-center self-stretch rounded-r-xl border border-border px-2 transition-colors hover:bg-secondary/25"
        >
          <ChevronDownSmallIcon
            aria-hidden="true"
            className="size-[18px] text-muted-foreground"
          />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner align="end" side="bottom" sideOffset={4}>
            <Menu.Popup className="z-50 min-w-[280px] origin-[var(--transform-origin)] rounded-xl border border-border bg-background p-1 shadow-lg transition-[transform,scale,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
              <Menu.Item
                className="flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-secondary/25"
                onSelect={handleCopy}
              >
                <MenuIcon>
                  <CopySimpleIcon aria-hidden="true" className="size-[18px]" />
                </MenuIcon>
                <div>
                  <div className="font-medium">Copy page</div>
                  <div className="text-xs text-muted-foreground">
                    Copy page as Markdown for LLMs
                  </div>
                </div>
              </Menu.Item>

              <MenuLink href={chatgptUrl}>
                <MenuIcon>
                  <OpenaiIcon aria-hidden="true" className="size-[18px]" />
                </MenuIcon>
                <div className="flex-1">
                  <div className="font-medium">
                    Open in ChatGPT
                    <ExternalArrow />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ask questions about this page
                  </div>
                </div>
              </MenuLink>

              <MenuLink href={claudeUrl}>
                <MenuIcon>
                  <ClaudeaiIcon aria-hidden="true" className="size-[18px]" />
                </MenuIcon>
                <div className="flex-1">
                  <div className="font-medium">
                    Open in Claude
                    <ExternalArrow />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ask questions about this page
                  </div>
                </div>
              </MenuLink>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
};
