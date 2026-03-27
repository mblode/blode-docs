"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import { toDocHref } from "@/lib/routes";

export interface SearchItem {
  title: string;
  path: string;
}

export const Search = ({
  items,
  basePath,
}: {
  items: SearchItem[];
  basePath: string;
}) => {
  const [query, setQuery] = useState("");
  const clearQuery = useCallback(() => {
    setQuery("");
  }, []);
  const handleQueryChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    []
  );
  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }
    const lower = query.toLowerCase();
    return items
      .filter(
        (item) =>
          item.title.toLowerCase().includes(lower) ||
          item.path.toLowerCase().includes(lower)
      )
      .slice(0, 6);
  }, [items, query]);

  return (
    <div className="relative">
      <input
        aria-label="Search content"
        className="min-w-44 rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground"
        onChange={handleQueryChange}
        placeholder="Search content"
        value={query}
      />
      {results.length ? (
        <div className="absolute right-0 top-11 z-20 grid min-w-56 gap-2 rounded-xl border border-border bg-popover p-2.5 shadow-popover">
          {results.map((item) => (
            <Link
              className="flex flex-col gap-0.5 rounded-lg px-2.5 py-2 hover:bg-accent"
              href={toDocHref(item.path, basePath)}
              key={item.path}
              onClick={clearQuery}
            >
              <span>{item.title}</span>
              <small className="text-muted-foreground">/{item.path}</small>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
};
