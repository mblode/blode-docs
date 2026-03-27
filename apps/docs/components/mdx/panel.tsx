import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
}

export const Panel = ({ children }: PanelProps) => (
  <aside className="my-4 rounded-xl border border-border bg-card p-4">
    {children}
  </aside>
);
