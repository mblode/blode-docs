import type { ReactNode } from "react";

interface FrameProps {
  caption?: string;
  hint?: string;
  children: ReactNode;
}

export const Frame = ({ caption, hint, children }: FrameProps) => (
  <figure className="my-4">
    {hint ? (
      <div className="mb-2 text-sm text-muted-foreground">{hint}</div>
    ) : null}
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {children}
    </div>
    {caption ? (
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">
        {caption}
      </figcaption>
    ) : null}
  </figure>
);
