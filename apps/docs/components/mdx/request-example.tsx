import type { ReactNode } from "react";

interface RequestExampleProps {
  children: ReactNode;
}

export const RequestExample = ({ children }: RequestExampleProps) => (
  <div className="my-4">
    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Request
    </div>
    <div className="[&>pre]:mt-0 [&>[data-rehype-pretty-code-figure]]:mt-0">
      {children}
    </div>
  </div>
);

export const ResponseExample = ({ children }: RequestExampleProps) => (
  <div className="my-4">
    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Response
    </div>
    <div className="[&>pre]:mt-0 [&>[data-rehype-pretty-code-figure]]:mt-0">
      {children}
    </div>
  </div>
);
