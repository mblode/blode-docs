import clsx from "clsx";
import type { ReactNode } from "react";

const icons: Record<string, string> = {
  danger: "!",
  info: "i",
  success: "✓",
  warning: "!",
};

interface CalloutProps {
  type?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: ReactNode;
}

export const Callout = ({ type = "info", title, children }: CalloutProps) => (
  <div className={clsx("callout", `callout--${type}`)}>
    <div aria-hidden className="callout__icon">
      {icons[type] ?? "i"}
    </div>
    <div className="callout__body">
      {title ? <strong className="callout__title">{title}</strong> : null}
      <div className="callout__content">{children}</div>
    </div>
  </div>
);
