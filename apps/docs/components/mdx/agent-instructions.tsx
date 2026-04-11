import type { ReactNode } from "react";

interface AgentInstructionsProps {
  children: ReactNode;
}

/**
 * Content inside <AgentInstructions> is hidden from human readers in the
 * rendered HTML but preserved in the raw MDX source. When pages are exported
 * as Markdown (via /{page}.md or llms-full.txt), the content is included so
 * AI agents receive it as context.
 */
export const AgentInstructions = ({ children }: AgentInstructionsProps) => (
  <div hidden data-agent-instructions="">
    {children}
  </div>
);
