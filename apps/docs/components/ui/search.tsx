"use client";

import { SearchIcon } from "blode-icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toDocHref } from "@/lib/routes";

export interface SearchItem {
  href?: string;
  title: string;
  path: string;
}

interface SearchResponse {
  items: SearchItem[];
}

export const Search = ({ basePath }: { basePath: string }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const requestRef = useRef<Promise<void> | null>(null);
  const loadedRef = useRef(false);

  const loadSearchItems = useCallback(() => {
    if (loadedRef.current) {
      return Promise.resolve();
    }
    if (requestRef.current) {
      return requestRef.current;
    }

    setStatus("loading");
    const request = (async () => {
      try {
        const response = await fetch(toDocHref("search", basePath), {
          headers: {
            accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load search index: ${response.status}`);
        }

        const payload = (await response.json()) as SearchResponse;
        const nextItems = Array.isArray(payload.items) ? payload.items : [];
        setItems(nextItems);
        loadedRef.current = true;
        setStatus("ready");
      } catch {
        setStatus("error");
      } finally {
        requestRef.current = null;
      }
    })();

    requestRef.current = request;
    return requestRef.current;
  }, [basePath]);

  useEffect(() => {
    const down = async (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }
        e.preventDefault();
        setOpen((prev) => !prev);
        await loadSearchItems();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [loadSearchItems]);

  const runCommand = useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  const handleOpen = useCallback(async () => {
    setOpen(true);
    await loadSearchItems();
  }, [loadSearchItems]);

  const prefetchSearchItems = useCallback(async () => {
    await loadSearchItems();
  }, [loadSearchItems]);

  const itemHandlers = useMemo(
    () =>
      Object.fromEntries(
        items.map((item) => [
          item.path,
          () =>
            runCommand(() => {
              if (item.href) {
                window.open(item.href, "_blank", "noopener,noreferrer");
                return;
              }
              router.push(toDocHref(item.path, basePath));
            }),
        ])
      ),
    [basePath, items, router, runCommand]
  );

  return (
    <>
      <button
        aria-label="Search documentation"
        className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground md:hidden"
        onFocus={prefetchSearchItems}
        onMouseEnter={prefetchSearchItems}
        onPointerEnter={prefetchSearchItems}
        onTouchStart={prefetchSearchItems}
        onClick={handleOpen}
        type="button"
      >
        <SearchIcon className="size-4.5" />
      </button>
      <Button
        className="relative hidden h-8 w-full justify-start rounded-lg bg-muted/50 pl-3 font-normal text-foreground shadow-none hover:bg-muted/80 sm:pr-12 md:flex md:w-48 lg:w-56 xl:w-64 dark:bg-card"
        onFocus={prefetchSearchItems}
        onMouseEnter={prefetchSearchItems}
        onPointerEnter={prefetchSearchItems}
        onTouchStart={prefetchSearchItems}
        onClick={handleOpen}
        variant="outline"
      >
        <span className="hidden lg:inline-flex">Search documentation...</span>
        <span className="inline-flex lg:hidden">Search...</span>
      </Button>
      <CommandDialog onOpenChange={setOpen} open={open}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          {status === "loading" ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading search index...
            </div>
          ) : null}
          {status === "error" ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Search is temporarily unavailable.
            </div>
          ) : null}
          {status === "ready" ? (
            <>
              <CommandEmpty>No results found.</CommandEmpty>
              {items.length ? (
                <CommandGroup heading="Pages">
                  {items.map((item) => (
                    <CommandItem
                      key={item.path}
                      // oxlint-disable-next-line eslint-plugin-react/jsx-handler-names
                      onSelect={itemHandlers[item.path]}
                      value={item.title}
                    >
                      {item.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
};
