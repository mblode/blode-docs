"use client";

import { slugify } from "@repo/common";
import {
  Checkmark1Icon,
  ChevronDownSmallIcon,
  ClaudeaiIcon,
  CopySimpleIcon,
  OpenaiIcon,
} from "blode-icons-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CopyPageMenuProps {
  content?: string;
  contentUrl?: string;
  title: string;
}

type CopyStatus = "copied" | "error" | "idle";

const LEADING_H1_REGEX = /^#\s+([^\r\n]+)(?:\r?\n(?:\r?\n)?)?/;

const stripMatchingLeadingH1 = (source: string, title: string) => {
  const trimmed = source.trimStart();
  const match = LEADING_H1_REGEX.exec(trimmed);
  if (!match) {
    return trimmed.trim();
  }

  const [headingLine = "", headingTitle = ""] = match;
  if (slugify(headingTitle) !== slugify(title)) {
    return trimmed.trim();
  }

  return trimmed.slice(headingLine.length).trim();
};

const formatMarkdownForCopy = (source: string, title: string) => {
  const content = stripMatchingLeadingH1(source, title);
  if (!content) {
    return `# ${title}`;
  }

  return `# ${title}\n\n${content}`;
};

const getCopyLabel = (copyStatus: CopyStatus) => {
  switch (copyStatus) {
    case "copied": {
      return "Copied";
    }
    case "error": {
      return "Copy failed";
    }
    default: {
      return "Copy page";
    }
  }
};

const getCopyDescription = (copyStatus: CopyStatus) => {
  switch (copyStatus) {
    case "copied": {
      return "Copied page markdown to clipboard";
    }
    case "error": {
      return "Clipboard access was blocked or the page markdown could not be loaded";
    }
    default: {
      return "Copy page as Markdown for LLMs";
    }
  }
};

const getCopyIcon = (copyStatus: CopyStatus) =>
  copyStatus === "copied" ? Checkmark1Icon : CopySimpleIcon;

const MenuItem = ({
  children,
  href,
  onSelect,
}: {
  children: React.ReactNode;
  href?: string;
  onSelect?: () => Promise<void> | void;
}) =>
  href ? (
    <a
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-secondary/25 focus-visible:bg-secondary/25 focus-visible:outline-none"
      href={href}
      onClick={onSelect}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ) : (
    <button
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary/25 focus-visible:bg-secondary/25 focus-visible:outline-none"
      onClick={onSelect}
      type="button"
    >
      {children}
    </button>
  );

const MenuIcon = ({ children }: { children: React.ReactNode }) => (
  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border">
    {children}
  </div>
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

export const CopyPageMenu = ({
  content,
  contentUrl,
  title,
}: CopyPageMenuProps) => {
  const resetTimerRef = useRef<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [fetchedContent, setFetchedContent] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    setPageUrl(
      new URL(contentUrl ?? window.location.href, window.location.href).href
    );
  }, [contentUrl]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const setTemporaryCopyStatus = useCallback(
    (nextStatus: "copied" | "error") => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }

      setCopyStatus(nextStatus);
      resetTimerRef.current = window.setTimeout(() => {
        setCopyStatus("idle");
        resetTimerRef.current = null;
      }, 2000);
    },
    []
  );

  const getContent = useCallback(async () => {
    const resolvedContent = content ?? fetchedContent;
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
    setFetchedContent(nextContent);
    return nextContent;
  }, [content, contentUrl, fetchedContent]);

  const handleCopy = useCallback(async () => {
    try {
      // iOS Safari loses the user gesture context after any async gap (e.g. a
      // fetch). To keep clipboard access working, we call clipboard.write()
      // synchronously within the gesture and pass a Promise to ClipboardItem
      // so the content resolves later while the gesture context stays alive.
      const blobPromise = getContent().then((nextContent) => {
        const markdown = formatMarkdownForCopy(nextContent, title);
        return new Blob([markdown], { type: "text/plain" });
      });

      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({ "text/plain": blobPromise }),
        ]);
      } else {
        const blob = await blobPromise;
        await navigator.clipboard.writeText(await blob.text());
      }

      setTemporaryCopyStatus("copied");
      closeMenu();
    } catch {
      setTemporaryCopyStatus("error");
    }
  }, [closeMenu, getContent, setTemporaryCopyStatus, title]);

  const chatgptUrl = pageUrl
    ? `https://chatgpt.com/?hints=search&q=${encodeURIComponent(`Read from ${pageUrl} so I can ask questions about it.`)}`
    : undefined;
  const claudeUrl = pageUrl
    ? `https://claude.ai/new?q=${encodeURIComponent(`Read from ${pageUrl} so I can ask questions about it.`)}`
    : undefined;
  const copyLabel = getCopyLabel(copyStatus);
  const copyDescription = getCopyDescription(copyStatus);
  const CopyIcon = getCopyIcon(copyStatus);

  return (
    <Popover onOpenChange={setMenuOpen} open={menuOpen}>
      <div className="flex shrink-0 items-center">
        <button
          className="inline-flex items-center gap-2 rounded-l-xl border border-r-0 border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary/25"
          onClick={handleCopy}
          type="button"
        >
          <CopyIcon aria-hidden="true" className="size-[18px]" />
          <span>{copyLabel}</span>
        </button>

        <PopoverTrigger asChild>
          <button
            aria-expanded={menuOpen}
            aria-label="More actions"
            className="inline-flex items-center self-stretch rounded-r-xl border border-border px-2 transition-colors hover:bg-secondary/25"
            type="button"
          >
            <ChevronDownSmallIcon
              aria-hidden="true"
              className="size-[18px] text-muted-foreground"
            />
          </button>
        </PopoverTrigger>
      </div>

      <PopoverContent align="end" className="w-[280px] rounded-xl p-1">
        <MenuItem onSelect={handleCopy}>
          <MenuIcon>
            <CopyIcon aria-hidden="true" className="size-[18px]" />
          </MenuIcon>
          <div>
            <div className="font-medium">{copyLabel}</div>
            <div className="text-xs text-muted-foreground">
              {copyDescription}
            </div>
          </div>
        </MenuItem>

        {chatgptUrl ? (
          <MenuItem href={chatgptUrl} onSelect={closeMenu}>
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
          </MenuItem>
        ) : null}

        {claudeUrl ? (
          <MenuItem href={claudeUrl} onSelect={closeMenu}>
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
          </MenuItem>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
