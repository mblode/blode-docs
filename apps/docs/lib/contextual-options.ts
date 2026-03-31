import type {
  ContextualBuiltinOption,
  ContextualCustomOption,
  ContextualOption,
} from "@repo/models";

interface BuiltinOptionDefinition {
  title: string;
  description: string;
  iconName: string;
  type: "action" | "link";
}

export const builtinOptions: Record<
  ContextualBuiltinOption,
  BuiltinOptionDefinition
> = {
  "add-mcp": {
    description: "Copy the npx add-mcp command",
    iconName: "CodeBracketsIcon",
    title: "Copy MCP install command",
    type: "action",
  },
  aistudio: {
    description: "Ask questions about this page",
    iconName: "GoogleColoredIcon",
    title: "Open in Google AI Studio",
    type: "link",
  },
  assistant: {
    description: "Open the assistant with this page as context",
    iconName: "SparkleIcon",
    title: "Ask assistant",
    type: "action",
  },
  chatgpt: {
    description: "Ask questions about this page",
    iconName: "OpenaiIcon",
    title: "Open in ChatGPT",
    type: "link",
  },
  claude: {
    description: "Ask questions about this page",
    iconName: "ClaudeaiIcon",
    title: "Open in Claude",
    type: "link",
  },
  copy: {
    description: "Copy page as Markdown for LLMs",
    iconName: "CopySimpleIcon",
    title: "Copy page",
    type: "action",
  },
  cursor: {
    description: "Install MCP server in Cursor",
    iconName: "CodeIcon",
    title: "Connect to Cursor",
    type: "link",
  },
  devin: {
    description: "Create a Devin session with this page",
    iconName: "CodeAssistantIcon",
    title: "Open in Devin",
    type: "link",
  },
  "devin-mcp": {
    description: "Install MCP server in Devin",
    iconName: "CodeAssistantIcon",
    title: "Connect to Devin",
    type: "link",
  },
  grok: {
    description: "Ask questions about this page",
    iconName: "GrokIcon",
    title: "Open in Grok",
    type: "link",
  },
  mcp: {
    description: "Copy your MCP server URL to clipboard",
    iconName: "Plugin1Icon",
    title: "Copy MCP server URL",
    type: "action",
  },
  perplexity: {
    description: "Ask questions about this page",
    iconName: "PerplexityIcon",
    title: "Open in Perplexity",
    type: "link",
  },
  view: {
    description: "Open the current page as Markdown",
    iconName: "MarkdownIcon",
    title: "View as Markdown",
    type: "link",
  },
  vscode: {
    description: "Install MCP server in VS Code",
    iconName: "CodeLinesIcon",
    title: "Connect to VS Code",
    type: "link",
  },
  windsurf: {
    description: "Open Windsurf Cascade with this page",
    iconName: "WindIcon",
    title: "Open in Windsurf",
    type: "link",
  },
};

interface UrlContext {
  pageUrl: string;
  pagePath: string;
  pageContent: string;
  mcpServerUrl?: string;
}

const PAGE_PLACEHOLDER = "$page";
const BUILTIN_OPTIONS_REQUIRING_PAGE_CONTENT = new Set<ContextualBuiltinOption>(
  ["assistant", "copy"]
);

const askPrompt = (url: string) =>
  `Read from ${url} so I can ask questions about it.`;

const encoded = (text: string) => encodeURIComponent(text);

const customHrefUsesPageContent = (href: ContextualCustomOption["href"]) =>
  typeof href === "string"
    ? href.includes(PAGE_PLACEHOLDER)
    : href.query.some((item) => item.value.includes(PAGE_PLACEHOLDER));

export const contextualOptionsRequirePageContent = (
  options: ContextualOption[]
) =>
  options.some((option) =>
    typeof option === "string"
      ? BUILTIN_OPTIONS_REQUIRING_PAGE_CONTENT.has(option)
      : customHrefUsesPageContent(option.href)
  );

export const buildBuiltinUrl = (
  id: ContextualBuiltinOption,
  context: UrlContext
): string | null => {
  const { pageUrl, pagePath, mcpServerUrl } = context;

  switch (id) {
    case "chatgpt": {
      return `https://chatgpt.com/?hints=search&q=${encoded(askPrompt(pageUrl))}`;
    }
    case "claude": {
      return `https://claude.ai/new?q=${encoded(askPrompt(pageUrl))}`;
    }
    case "perplexity": {
      return `https://www.perplexity.ai/?q=${encoded(askPrompt(pageUrl))}`;
    }
    case "grok": {
      return `https://grok.com/?q=${encoded(askPrompt(pageUrl))}`;
    }
    case "aistudio": {
      return `https://aistudio.google.com/prompts/new_chat?q=${encoded(askPrompt(pageUrl))}`;
    }
    case "devin": {
      return `https://app.devin.ai/sessions?url=${encoded(pageUrl)}`;
    }
    case "windsurf": {
      return `windsurf://cascade?url=${encoded(pageUrl)}`;
    }
    case "view": {
      const mdxPath = pagePath === "index" ? "/index" : `/${pagePath}`;
      return `${mdxPath}.mdx`;
    }
    case "cursor": {
      return mcpServerUrl
        ? `cursor://anysphere.cursor-deeplink/mcp/install?url=${encoded(mcpServerUrl)}`
        : null;
    }
    case "vscode": {
      return mcpServerUrl
        ? `vscode://anysphere.open-mcp?url=${encoded(mcpServerUrl)}`
        : null;
    }
    case "devin-mcp": {
      return mcpServerUrl
        ? `https://app.devin.ai/mcp/install?url=${encoded(mcpServerUrl)}`
        : null;
    }
    default: {
      return null;
    }
  }
};

export const resolveCustomHref = (
  href: ContextualCustomOption["href"],
  context: UrlContext
): string => {
  const substitute = (value: string) =>
    value
      .replaceAll("$page", context.pageContent)
      .replaceAll("$path", context.pagePath)
      .replaceAll("$mcp", context.mcpServerUrl ?? "");

  if (typeof href === "string") {
    return substitute(href);
  }

  const params = new URLSearchParams();
  for (const item of href.query) {
    params.set(item.key, substitute(item.value));
  }
  return `${href.base}?${params.toString()}`;
};
