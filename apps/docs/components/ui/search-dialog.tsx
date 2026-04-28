"use client";

import { SearchIcon } from "blode-icons-react";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { isExternalHref, resolveHref, toDocHref } from "@/lib/routes";

export interface SearchItem {
  href?: string;
  title: string;
  path: string;
}

interface SearchResponse {
  items: SearchItem[];
}

type SearchStatus = "idle" | "loading" | "ready" | "error";

interface SearchState {
  activeIndex: number;
  items: SearchItem[];
  query: string;
  status: SearchStatus;
}

type SearchAction =
  | { type: "load-error" }
  | { type: "load-start" }
  | { items: SearchItem[]; type: "load-success" }
  | { type: "reset-query" }
  | { index: number; type: "set-active-index" }
  | { query: string; type: "set-query" };

const MAX_RESULTS = 12;
const INITIAL_SEARCH_STATE: SearchState = {
  activeIndex: 0,
  items: [],
  query: "",
  status: "idle",
};

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

const searchReducer = (
  state: SearchState,
  action: SearchAction
): SearchState => {
  switch (action.type) {
    case "load-error": {
      return {
        ...state,
        status: "error",
      };
    }
    case "load-start": {
      return {
        ...state,
        status: "loading",
      };
    }
    case "load-success": {
      return {
        ...state,
        items: action.items,
        status: "ready",
      };
    }
    case "reset-query": {
      return {
        ...state,
        activeIndex: 0,
        query: "",
      };
    }
    case "set-active-index": {
      return {
        ...state,
        activeIndex: action.index,
      };
    }
    case "set-query": {
      return {
        ...state,
        activeIndex: 0,
        query: action.query,
      };
    }
    default: {
      return state;
    }
  }
};

const SearchResults = ({
  activeIndex,
  basePath,
  filteredItems,
  onResultClick,
  onResultMouseEnter,
  status,
}: {
  activeIndex: number;
  basePath: string;
  filteredItems: SearchItem[];
  onResultClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onResultMouseEnter: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  status: SearchStatus;
}) => {
  if (status === "loading") {
    return (
      <div className="px-3 py-10 text-center text-sm text-muted-foreground">
        Loading search index...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="px-3 py-10 text-center text-sm text-muted-foreground">
        Search is temporarily unavailable.
      </div>
    );
  }

  if (status === "ready" && filteredItems.length === 0) {
    return (
      <div className="px-3 py-10 text-center text-sm text-muted-foreground">
        No results found.
      </div>
    );
  }

  if (status !== "ready") {
    return null;
  }

  return (
    <div className="grid gap-1">
      {filteredItems.map((item, index) => {
        const href = item.href
          ? resolveHref(item.href, basePath)
          : toDocHref(item.path, basePath);
        const isActive = index === activeIndex;

        return (
          <button
            className={
              isActive
                ? "grid gap-1 rounded-xl bg-accent px-3 py-2 text-left text-foreground transition-colors"
                : "grid gap-1 rounded-xl px-3 py-2 text-left text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
            }
            data-index={index}
            key={`${item.path}-${item.href ?? "internal"}`}
            onClick={onResultClick}
            onMouseEnter={onResultMouseEnter}
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
  );
};

export const SearchDialog = ({
  basePath,
  open,
  onOpenChange,
}: {
  basePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const loadedRef = useRef(false);
  const [state, dispatch] = useReducer(searchReducer, INITIAL_SEARCH_STATE);
  const { activeIndex, items, query, status } = state;

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const loadSearchItems = useCallback(() => {
    if (loadedRef.current) {
      return Promise.resolve();
    }

    if (requestRef.current) {
      return requestRef.current;
    }

    dispatch({ type: "load-start" });
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
          dispatch({ items: nextItems, type: "load-success" });
        });
      } catch {
        dispatch({ type: "load-error" });
      } finally {
        requestRef.current = null;
      }
    })();

    requestRef.current = request;
    return request;
  }, [basePath]);

  // Load the search index as soon as the dialog mounts.
  useEffect(() => {
    const run = async () => {
      try {
        await loadSearchItems();
      } catch {
        // Errors are surfaced via the reducer's "load-error" action.
      }
    };

    run();
  }, [loadSearchItems]);

  const filteredItems = useMemo(
    () =>
      items
        .filter((item) => searchMatches(item, deferredQuery))
        .slice(0, MAX_RESULTS),
    [deferredQuery, items]
  );

  const closeSearch = useCallback(() => {
    dispatch({ type: "reset-query" });
    onOpenChange(false);
  }, [onOpenChange]);

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

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        closeSearch();
      }
    },
    [closeSearch]
  );

  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      dispatch({ query: event.target.value, type: "set-query" });
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

      dispatch({ index, type: "set-active-index" });
    },
    []
  );

  const handleDialogKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        dispatch({
          index: getWrappedNextIndex(activeIndex, filteredItems.length),
          type: "set-active-index",
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        dispatch({
          index: getWrappedPrevIndex(activeIndex, filteredItems.length),
          type: "set-active-index",
        });
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
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden p-0"
        onKeyDown={handleDialogKeyDown}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search documentation</DialogTitle>
        <DialogDescription className="sr-only">
          Search documentation pages and jump directly to a result.
        </DialogDescription>
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
          <SearchResults
            activeIndex={activeIndex}
            basePath={basePath}
            filteredItems={filteredItems}
            onResultClick={handleResultClick}
            onResultMouseEnter={handleResultMouseEnter}
            status={status}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
