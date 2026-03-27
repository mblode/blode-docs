import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ColumnsProps {
  cols?: 1 | 2 | 3 | 4;
  children: ReactNode;
}

const colStyles: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export const Columns = ({ cols = 2, children }: ColumnsProps) => (
  <div className={cn("my-4 grid gap-4", colStyles[cols] ?? colStyles[2])}>
    {children}
  </div>
);

export const Column = ({ children }: { children: ReactNode }) => (
  <div className="min-w-0">{children}</div>
);
