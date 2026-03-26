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
  <div className="mdx-preview">
    <div className="mdx-preview__meta">
      <span className="mdx-preview__label">{title}</span>
      {example ? <span className="mdx-preview__chip">{example}</span> : null}
      {source ? <span className="mdx-preview__chip">{source}</span> : null}
    </div>
    <div className="mdx-preview__frame">
      {children ?? (
        <div className="mdx-preview__placeholder">
          Interactive preview placeholder
        </div>
      )}
    </div>
  </div>
);
