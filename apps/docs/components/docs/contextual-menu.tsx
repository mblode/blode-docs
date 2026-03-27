"use client";

import { Menu } from "@base-ui/react/menu";
import type { ContextualOption } from "@repo/models";
import {
  Checkmark1Icon,
  ChevronDownSmallIcon,
  ClaudeaiIcon,
  CodeAssistantIcon,
  CodeBracketsIcon,
  CodeIcon,
  CodeLinesIcon,
  CopySimpleIcon,
  GoogleColoredIcon,
  GrokIcon,
  MarkdownIcon,
  OpenaiIcon,
  PerplexityIcon,
  Plugin1Icon,
  SparkleIcon,
  WindIcon,
} from "blode-icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";

import {
  buildBuiltinUrl,
  builtinOptions,
  resolveCustomHref,
} from "@/lib/contextual-options";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const iconMap: Record<string, IconComponent> = {
  ClaudeaiIcon,
  CodeAssistantIcon,
  CodeBracketsIcon,
  CodeIcon,
  CodeLinesIcon,
  CopySimpleIcon,
  GoogleColoredIcon,
  GrokIcon,
  MarkdownIcon,
  OpenaiIcon,
  PerplexityIcon,
  Plugin1Icon,
  SparkleIcon,
  WindIcon,
};

const getBuiltinIcon = (iconName: string): IconComponent =>
  iconMap[iconName] ?? CopySimpleIcon;

type ActionId = "copy" | "mcp" | "add-mcp" | "assistant";

interface ResolvedOption {
  key: string;
  title: string;
  description: string;
  icon: IconComponent;
  type: "action" | "link";
  action?: ActionId;
  href?: string;
}

interface ContextualContext {
  pageUrl: string;
  pageContent: string;
  pagePath: string;
  mcpServerUrl?: string;
}

const resolveOptions = (
  options: ContextualOption[],
  context: ContextualContext
): ResolvedOption[] => {
  const resolved: ResolvedOption[] = [];
  for (const option of options) {
    if (typeof option === "string") {
      const def = builtinOptions[option];
      if (!def) {
        continue;
      }
      if (def.type === "action") {
        resolved.push({
          action: option as ActionId,
          description: def.description,
          icon: getBuiltinIcon(def.iconName),
          key: option,
          title: def.title,
          type: "action",
        });
      } else {
        const href = buildBuiltinUrl(option, context);
        if (href) {
          resolved.push({
            description: def.description,
            href,
            icon: getBuiltinIcon(def.iconName),
            key: option,
            title: def.title,
            type: "link",
          });
        }
      }
    } else {
      resolved.push({
        description: option.description,
        href: resolveCustomHref(option.href, context),
        icon: CopySimpleIcon,
        key: `custom-${option.title}`,
        title: option.title,
        type: "link",
      });
    }
  }
  return resolved;
};

const useContextualActions = (content: string, title: string) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAction = useCallback(
    async (action: string, key?: string) => {
      const id = key ?? action;
      switch (action) {
        case "copy": {
          await navigator.clipboard.writeText(`# ${title}\n\n${content}`);
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
          break;
        }
        default: {
          break;
        }
      }
    },
    [content, title]
  );

  return { copiedId, handleAction };
};

const usePageContext = (
  content: string,
  title: string,
  pagePath: string
): ContextualContext => {
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  return {
    mcpServerUrl: undefined,
    pageContent: `# ${title}\n\n${content}`,
    pagePath,
    pageUrl,
  };
};

const MenuIcon = ({ children }: { children: ReactNode }) => (
  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border">
    {children}
  </div>
);

const MenuLink = ({
  children,
  href,
}: {
  children: ReactNode;
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

interface ContextualMenuProps {
  options: ContextualOption[];
  content: string;
  title: string;
  pagePath: string;
}

export const ContextualMenu = ({
  options,
  content,
  title,
  pagePath,
}: ContextualMenuProps) => {
  const context = usePageContext(content, title, pagePath);
  const { copiedId, handleAction } = useContextualActions(content, title);
  const resolved = resolveOptions(options, context);

  const [primaryOption] = resolved;

  const handlePrimaryAction = useCallback(
    () => handleAction(primaryOption?.action ?? ""),
    [handleAction, primaryOption?.action]
  );

  const itemHandlers = useMemo(
    () =>
      Object.fromEntries(
        resolved
          .filter((item) => item.type === "action")
          .map((item) => [item.key, () => handleAction(item.action ?? "")])
      ),
    [resolved, handleAction]
  );

  if (!primaryOption) {
    return null;
  }

  const isCopied = copiedId === primaryOption.key;

  return (
    <div className="flex shrink-0 items-center">
      {primaryOption.type === "action" ? (
        <button
          className="inline-flex items-center gap-2 rounded-l-xl border border-r-0 border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary/25"
          onClick={handlePrimaryAction}
          type="button"
        >
          {isCopied ? (
            <Checkmark1Icon aria-hidden="true" className="size-[18px]" />
          ) : (
            <primaryOption.icon aria-hidden="true" className="size-[18px]" />
          )}
          <span>{isCopied ? "Copied" : primaryOption.title}</span>
        </button>
      ) : (
        <a
          className="inline-flex items-center gap-2 rounded-l-xl border border-r-0 border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary/25"
          href={primaryOption.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          <primaryOption.icon aria-hidden="true" className="size-[18px]" />
          <span>{primaryOption.title}</span>
        </a>
      )}

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
              {resolved.map((item) => {
                const isItemCopied = copiedId === item.key;
                const Icon = isItemCopied ? Checkmark1Icon : item.icon;

                if (item.type === "action") {
                  return (
                    <Menu.Item
                      className="flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-secondary/25"
                      key={item.key}
                      // oxlint-disable-next-line eslint-plugin-react/jsx-handler-names
                      onSelect={itemHandlers[item.key]}
                    >
                      <MenuIcon>
                        <Icon aria-hidden="true" className="size-[18px]" />
                      </MenuIcon>
                      <div>
                        <div className="font-medium">
                          {isItemCopied ? "Copied" : item.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                    </Menu.Item>
                  );
                }

                return (
                  <MenuLink href={item.href ?? "#"} key={item.key}>
                    <MenuIcon>
                      <Icon aria-hidden="true" className="size-[18px]" />
                    </MenuIcon>
                    <div className="flex-1">
                      <div className="font-medium">
                        {item.title}
                        <ExternalArrow />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </MenuLink>
                );
              })}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
};

export const ContextualTocItems = ({
  options,
  content,
  title,
  pagePath,
}: ContextualMenuProps) => {
  const context = usePageContext(content, title, pagePath);
  const { copiedId, handleAction } = useContextualActions(content, title);
  const resolved = resolveOptions(options, context);

  const tocItemHandlers = useMemo(
    () =>
      Object.fromEntries(
        resolved
          .filter((item) => item.type === "action")
          .map((item) => [
            item.key,
            () => handleAction(item.action ?? "", item.key),
          ])
      ),
    [resolved, handleAction]
  );

  if (!resolved.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <p className="font-medium text-muted-foreground text-xs">AI Tools</p>
      {resolved.map((item) => {
        const isItemCopied = copiedId === item.key;
        const Icon = isItemCopied ? Checkmark1Icon : item.icon;

        if (item.type === "action") {
          return (
            <button
              className="flex items-center gap-2 text-left text-[0.8rem] text-muted-foreground no-underline transition-colors hover:text-foreground"
              key={item.key}
              // oxlint-disable-next-line eslint-plugin-react/jsx-handler-names
              onClick={tocItemHandlers[item.key]}
              type="button"
            >
              <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              <span>{isItemCopied ? "Copied" : item.title}</span>
            </button>
          );
        }

        return (
          <a
            className="flex items-center gap-2 text-[0.8rem] text-muted-foreground no-underline transition-colors hover:text-foreground"
            href={item.href}
            key={item.key}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            <span>{item.title}</span>
          </a>
        );
      })}
    </div>
  );
};
