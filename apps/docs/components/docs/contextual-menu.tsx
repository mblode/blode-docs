"use client";

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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  buildBuiltinUrl,
  builtinOptions,
  resolveCustomHref,
} from "@/lib/contextual-options";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
type ActionId = "add-mcp" | "assistant" | "copy" | "mcp";

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

interface ActionFeedback {
  id: string;
  state: "copied" | "error";
}

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

const getFeedbackLabel = (
  feedbackState: ActionFeedback["state"] | null,
  defaultLabel: string
) => {
  switch (feedbackState) {
    case "copied": {
      return "Copied";
    }
    case "error": {
      return "Copy failed";
    }
    default: {
      return defaultLabel;
    }
  }
};

const getFeedbackDescription = (
  feedbackState: ActionFeedback["state"] | null,
  defaultDescription: string
) => {
  switch (feedbackState) {
    case "copied": {
      return "Copied to clipboard";
    }
    case "error": {
      return "Clipboard access was blocked";
    }
    default: {
      return defaultDescription;
    }
  }
};

const getFeedbackIcon = (
  feedbackState: ActionFeedback["state"] | null,
  defaultIcon: IconComponent
) => {
  if (feedbackState === "copied") {
    return Checkmark1Icon;
  }

  return defaultIcon;
};

const resolveOptions = (
  options: ContextualOption[],
  context: ContextualContext
): ResolvedOption[] => {
  const resolved: ResolvedOption[] = [];

  for (const option of options) {
    if (typeof option === "string") {
      const definition = builtinOptions[option];
      if (!definition) {
        continue;
      }

      if (definition.type === "action") {
        resolved.push({
          action: option as ActionId,
          description: definition.description,
          icon: getBuiltinIcon(definition.iconName),
          key: option,
          title: definition.title,
          type: "action",
        });
        continue;
      }

      const href = buildBuiltinUrl(option, context);
      if (!href) {
        continue;
      }

      resolved.push({
        description: definition.description,
        href,
        icon: getBuiltinIcon(definition.iconName),
        key: option,
        title: definition.title,
        type: "link",
      });
      continue;
    }

    resolved.push({
      description: option.description,
      href: resolveCustomHref(option.href, context),
      icon: CopySimpleIcon,
      key: `custom-${option.title}`,
      title: option.title,
      type: "link",
    });
  }

  return resolved;
};

const useContextualActions = (content: string | undefined, title: string) => {
  const resetTimerRef = useRef<number | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    []
  );

  const setActionFeedback = useCallback(
    (id: string, state: ActionFeedback["state"]) => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }

      setFeedback({ id, state });
      resetTimerRef.current = window.setTimeout(() => {
        setFeedback(null);
        resetTimerRef.current = null;
      }, 2000);
    },
    []
  );

  const handleAction = useCallback(
    async (action: string, key?: string) => {
      const id = key ?? action;

      switch (action) {
        case "copy": {
          try {
            await navigator.clipboard.writeText(
              `# ${title}\n\n${content ?? ""}`
            );
            setActionFeedback(id, "copied");
            return true;
          } catch {
            setActionFeedback(id, "error");
            return false;
          }
        }
        default: {
          return true;
        }
      }
    },
    [content, setActionFeedback, title]
  );

  return { feedback, handleAction };
};

const usePageContext = (
  content: string | undefined,
  title: string,
  pagePath: string
): ContextualContext => {
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, [pagePath]);

  return useMemo(
    () => ({
      mcpServerUrl: undefined,
      pageContent: `# ${title}\n\n${content ?? ""}`,
      pagePath,
      pageUrl,
    }),
    [content, pagePath, pageUrl, title]
  );
};

const MenuIcon = ({ children }: { children: ReactNode }) => (
  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border">
    {children}
  </div>
);

const MenuItem = ({
  children,
  href,
  onSelect,
}: {
  children: ReactNode;
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
  content?: string;
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
  const { feedback, handleAction } = useContextualActions(content, title);
  const [menuOpen, setMenuOpen] = useState(false);

  const resolved = useMemo(
    () => resolveOptions(options, context),
    [context, options]
  );
  const [primaryOption] = resolved;
  const hasSecondaryOptions = resolved.length > 1;

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const handlePrimaryAction = useCallback(async () => {
    if (!primaryOption) {
      return;
    }

    if (primaryOption.type === "link" && primaryOption.href) {
      window.open(primaryOption.href, "_blank", "noopener,noreferrer");
      return;
    }

    await handleAction(primaryOption.action ?? "", primaryOption.key);
  }, [handleAction, primaryOption]);

  const actionHandlers = useMemo(
    () =>
      Object.fromEntries(
        resolved
          .filter((item) => item.type === "action")
          .map((item) => [
            item.key,
            async () => {
              const didComplete = await handleAction(
                item.action ?? "",
                item.key
              );
              if (didComplete) {
                closeMenu();
              }
            },
          ])
      ) as Record<string, () => Promise<void>>,
    [closeMenu, handleAction, resolved]
  );

  if (!primaryOption) {
    return null;
  }

  const primaryFeedback =
    feedback?.id === primaryOption.key ? feedback.state : null;
  const primaryLabel = getFeedbackLabel(primaryFeedback, primaryOption.title);
  const PrimaryIcon = getFeedbackIcon(primaryFeedback, primaryOption.icon);
  const primaryButtonClassName = hasSecondaryOptions
    ? "inline-flex items-center gap-2 rounded-l-xl border border-r-0 border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary/25"
    : "inline-flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary/25";
  const primaryButton = (
    <button
      className={primaryButtonClassName}
      onClick={handlePrimaryAction}
      type="button"
    >
      <PrimaryIcon aria-hidden="true" className="size-[18px]" />
      <span>{primaryLabel}</span>
    </button>
  );

  if (!hasSecondaryOptions) {
    return <div className="flex shrink-0 items-center">{primaryButton}</div>;
  }

  return (
    <Popover onOpenChange={setMenuOpen} open={menuOpen}>
      <div className="flex shrink-0 items-center">
        {primaryButton}

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

      <PopoverContent align="end" className="w-[320px] rounded-xl p-1">
        {resolved.slice(1).map((item) => {
          const itemFeedback =
            feedback?.id === item.key ? feedback.state : null;
          const itemLabel = getFeedbackLabel(itemFeedback, item.title);
          const itemDescription = getFeedbackDescription(
            itemFeedback,
            item.description
          );
          const ItemIcon = getFeedbackIcon(itemFeedback, item.icon);

          return (
            <MenuItem
              href={item.type === "link" ? item.href : undefined}
              key={item.key}
              onSelect={
                item.type === "action" ? actionHandlers[item.key] : closeMenu
              }
            >
              <MenuIcon>
                <ItemIcon aria-hidden="true" className="size-[18px]" />
              </MenuIcon>
              <div className="flex-1">
                <div className="font-medium">
                  {itemLabel}
                  {item.type === "link" ? <ExternalArrow /> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {itemDescription}
                </div>
              </div>
            </MenuItem>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};

export const ContextualTocItems = ({
  content,
  options,
  title,
  pagePath,
}: ContextualMenuProps) => {
  const context = usePageContext(content, title, pagePath);
  const resolved = useMemo(
    () =>
      resolveOptions(options, context).filter(
        (item): item is ResolvedOption & { href: string; type: "link" } =>
          item.type === "link" && Boolean(item.href)
      ),
    [context, options]
  );

  if (!resolved.length) {
    return null;
  }

  return (
    <div className="grid gap-1.5">
      {resolved.map((item) => (
        <a
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          href={item.href}
          key={item.key}
          rel="noopener noreferrer"
          target="_blank"
        >
          <item.icon aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{item.title}</span>
        </a>
      ))}
    </div>
  );
};
