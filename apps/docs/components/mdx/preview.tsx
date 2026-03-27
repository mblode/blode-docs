import type { ReactNode } from "react";

export const Preview = ({
  example,
  source,
  title = "Preview",
  children,
}: {
  example?: string;
  source?: string;
  title?: string;
  children?: ReactNode;
}) => (
  <div className="my-4 grid gap-3 rounded-xl border border-border bg-surface p-4">
    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
      <span className="font-semibold">{title}</span>
      {example ? (
        <span className="rounded-full border border-border bg-accent px-2.5 py-1 text-primary">
          {example}
        </span>
      ) : null}
      {source ? (
        <span className="rounded-full border border-border bg-accent px-2.5 py-1 text-primary">
          {source}
        </span>
      ) : null}
    </div>
    <div className="rounded-xl border border-dashed border-border bg-gradient-to-br from-primary/15 to-primary/5 p-4.5">
      {children ?? (
        <div className="text-sm text-muted-foreground">
          Interactive preview placeholder
        </div>
      )}
    </div>
  </div>
);
