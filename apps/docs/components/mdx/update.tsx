import type { ReactNode } from "react";

interface UpdateProps {
  label: string;
  description?: string;
  tags?: string[];
  children: ReactNode;
}

export const Update = ({ label, description, tags, children }: UpdateProps) => {
  const anchorId = label.toLowerCase().replaceAll(/\s+/g, "-");

  return (
    <div
      className="relative border-b border-border py-8 first:pt-0 last:border-b-0"
      id={anchorId}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <a
          className="text-lg font-semibold text-foreground hover:underline"
          href={`#${anchorId}`}
        >
          {label}
        </a>
        {description ? (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {description}
          </span>
        ) : null}
        {tags?.map((tag) => (
          <span
            className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="prose prose-sm text-muted-foreground [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
};
