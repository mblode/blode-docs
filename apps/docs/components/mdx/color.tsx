import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ColorItemProps {
  name?: string;
  value: string | { light: string; dark: string };
}

const ColorItem = ({ name, value }: ColorItemProps) => {
  const lightValue = typeof value === "string" ? value : value.light;
  const darkValue = typeof value === "string" ? value : value.dark;

  return (
    <div className="flex items-center gap-3">
      <div
        className="size-8 shrink-0 rounded-md border border-border"
        style={{ backgroundColor: lightValue }}
      >
        {typeof value === "string" ? null : (
          <div
            className="hidden size-full rounded-md dark:block"
            style={{ backgroundColor: darkValue }}
          />
        )}
      </div>
      <div className="min-w-0">
        {name ? (
          <div className="text-sm font-medium text-foreground">{name}</div>
        ) : null}
        <div className="font-mono text-xs text-muted-foreground">
          {lightValue}
        </div>
      </div>
    </div>
  );
};

interface ColorRowProps {
  title?: string;
  children: ReactNode;
}

const ColorRow = ({ title, children }: ColorRowProps) => (
  <>
    {title ? (
      <tr>
        <td
          className="border-b border-border bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          colSpan={2}
        >
          {title}
        </td>
      </tr>
    ) : null}
    {children}
  </>
);

interface ColorProps {
  variant?: "compact" | "table";
  children: ReactNode;
}

const Color = ({ variant = "compact", children }: ColorProps) => (
  <div
    className={cn(
      "my-4",
      variant === "compact" &&
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
      variant === "table" && "overflow-hidden rounded-xl border border-border"
    )}
  >
    {variant === "table" ? (
      <table className="w-full text-sm">
        <tbody>{children}</tbody>
      </table>
    ) : (
      children
    )}
  </div>
);

Color.Item = ColorItem;
Color.Row = ColorRow;

export { Color };
