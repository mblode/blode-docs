"use client";

import { SearchIcon } from "blode-icons-react";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";

import { isExternalHref, resolveHref, toDocHref } from "@/lib/routes";

export interface SearchItem {
  href?: string;
  title: string;
  path: string;
}

interface SearchResponse {
  items: SearchItem[];
}

const MAX_RESULTS = 12;

const isEditableTarget = (target: EventTarget | null) =>
  (target instanceof HTMLElement && target.isContentEditable) ||
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement;

const searchMatches = (item: SearchItem, query: string) => {
  if (!query) {
    return true;
  }

  const haystack =
    `${item.title} ${item.path} ${item.href ?? ""}`.toLowerCase();
  return haystack.includes(query);
};

const getWrappedNextIndex = (current: number, length: number) => {
  if (length === 0 || current >= length - 1) {
    return 0;
  }

  return current + 1;
};

const getWrappedPrevIndex = (current: number, length: number) => {
  if (length === 0 || current <= 0) {
    return length - 1;
  }

  return current - 1;
};

export const Search = ({ basePath }: { basePath: string }) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const loadedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

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
        loadedRef.current = true;
        startTransition(() => {
          setItems(nextItems);
          setStatus("ready");
        });
      } catch {
        setStatus("error");
      } finally {
        requestRef.current = null;
      }
    })();

    requestRef.current = request;
    return request;
  }, [basePath]);

  const filteredItems = useMemo(
    () =>
      items
        .filter((item) => searchMatches(item, deferredQuery))
        .slice(0, MAX_RESULTS),
    [deferredQuery, items]
  );

  const closeSearch = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const runSelection = useCallback(
    (item: SearchItem) => {
      closeSearch();
      const href = item.href
        ? resolveHref(item.href, basePath)
        : toDocHref(item.path, basePath);
      if (item.href && isExternalHref(item.href)) {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      router.push(href);
    },
    [basePath, closeSearch, router]
  );

  const openSearch = useCallback(async () => {
    setOpen(true);
    await loadSearchItems();
  }, [loadSearchItems]);

  const warmSearch = useCallback(async () => {
    try {
      await loadSearchItems();
    } catch {
      // Ignore warm-up failures and let the explicit open path show the error state.
    }
  }, [loadSearchItems]);

  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    []
  );

  const handleResultClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      const index = Number(event.currentTarget.dataset.index);
      const item = filteredItems[index];
      if (!item) {
        return;
      }

      runSelection(item);
    },
    [filteredItems, runSelection]
  );

  const handleResultMouseEnter = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      const index = Number(event.currentTarget.dataset.index);
      if (Number.isNaN(index)) {
        return;
      }

      setActiveIndex(index);
    },
    []
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [deferredQuery, open]);

  useEffect(() => {
    const handleKeydown = async (event: KeyboardEvent) => {
      if (
        (event.key === "k" && (event.metaKey || event.ctrlKey)) ||
        event.key === "/"
      ) {
        if (isEditableTarget(event.target)) {
          return;
        }

        event.preventDefault();
        if (open) {
          closeSearch();
          return;
        }
        await openSearch();
        return;
      }

      if (!open || event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      closeSearch();
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [closeSearch, open, openSearch]);

  const handleDialogKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) =>
          getWrappedNextIndex(current, filteredItems.length)
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) =>
          getWrappedPrevIndex(current, filteredItems.length)
        );
        return;
      }

      if (event.key === "Enter") {
        const activeItem = filteredItems[activeIndex];
        if (!activeItem) {
          return;
        }

        event.preventDefault();
        runSelection(activeItem);
      }
    },
    [activeIndex, filteredItems, runSelection]
  );

  return (
    <>
      <button
        aria-label="Search documentation"
        className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground md:hidden"
        onClick={openSearch}
        onFocus={warmSearch}
        onMouseEnter={warmSearch}
        type="button"
      >
        <SearchIcon className="size-4.5" />
      </button>
      <button
        className="relative hidden h-8 w-full items-center justify-start rounded-lg border border-border bg-muted/50 pl-3 text-sm font-normal text-foreground shadow-none transition-colors hover:bg-muted/80 md:flex md:w-48 lg:w-56 xl:w-64 dark:bg-card"
        onClick={openSearch}
        onFocus={warmSearch}
        onMouseEnter={warmSearch}
        type="button"
      >
        <span className="hidden lg:inline-flex">Search documentation...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <span className="ml-auto hidden pr-3 text-[11px] text-muted-foreground sm:inline-flex">
          Cmd K
        </span>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close search"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={closeSearch}
            type="button"
          />
          <div
            aria-modal="true"
            className="relative mx-auto mt-[10vh] flex w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            onKeyDown={handleDialogKeyDown}
            role="dialog"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <SearchIcon className="size-4 text-muted-foreground" />
              <input
                aria-label="Search documentation"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                onChange={handleQueryChange}
                placeholder="Search docs..."
                ref={inputRef}
                type="text"
                value={query}
              />
              <button
                className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={closeSearch}
                type="button"
              >
                Esc
              </button>
            </div>
            <div className="max-h-[min(70vh,32rem)] overflow-y-auto p-2">
              {status === "loading" ? (
                <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Loading search index...
                </div>
              ) : null}
              {status === "error" ? (
                <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Search is temporarily unavailable.
                </div>
              ) : null}
              {status === "ready" && filteredItems.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No results found.
                </div>
              ) : null}
              {status === "ready" && filteredItems.length > 0 ? (
                <div className="grid gap-1">
                  {filteredItems.map((item, index) => {
                    const isActive = index === activeIndex;
                    const href = item.href
                      ? resolveHref(item.href, basePath)
                      : toDocHref(item.path, basePath);

                    return (
                      <button
                        className={`grid gap-1 rounded-xl px-3 py-2 text-left transition-colors ${
                          isActive
                            ? "bg-accent text-foreground"
                            : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                        }`}
                        data-index={index}
                        key={`${item.path}-${item.href ?? "internal"}`}
                        onClick={handleResultClick}
                        onMouseEnter={handleResultMouseEnter}
                        type="button"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="text-xs">{href}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
