"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TreeFileProps {
  name: string;
}

const TreeFile = ({ name }: TreeFileProps) => (
  <div className="flex items-center gap-2 py-0.5 pl-5 text-sm">
    <svg
      aria-hidden
      className="size-4 shrink-0 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v4a2 2 0 0 0 2 2h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span className="text-foreground">{name}</span>
  </div>
);

interface TreeFolderProps {
  name: string;
  defaultOpen?: boolean;
  openable?: boolean;
  children?: ReactNode;
}

const TreeFolder = ({
  name,
  defaultOpen = false,
  openable = true,
  children,
}: TreeFolderProps) => {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => {
    if (openable) {
      setOpen((prev) => !prev);
    }
  }, [openable]);

  return (
    <div>
      <button
        className={cn(
          "flex w-full items-center gap-2 py-0.5 text-sm border-none bg-transparent text-left",
          openable && "cursor-pointer hover:bg-accent/50 rounded"
        )}
        disabled={!openable}
        onClick={toggle}
        type="button"
      >
        <svg
          aria-hidden
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <svg
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          {open ? (
            <path
              d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h4a2 2 0 0 1 2 2v1M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <span className="font-medium text-foreground">{name}</span>
      </button>
      {open && children ? (
        <div className="ml-3 border-l border-border pl-2">{children}</div>
      ) : null}
    </div>
  );
};

const Tree = ({ children }: { children: ReactNode }) => (
  <div className="my-4 rounded-xl border border-border bg-card p-4 font-mono text-sm">
    {children}
  </div>
);

Tree.Folder = TreeFolder;
Tree.File = TreeFile;

export { Tree };
