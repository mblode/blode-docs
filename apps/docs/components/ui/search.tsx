"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
    <div className="search">
      <input
        aria-label="Search content"
        className="search__input"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search content"
        value={query}
      />
      {results.length ? (
        <div className="search__results">
          {results.map((item) => (
            <Link
              className="search__result"
              href={toDocHref(item.path, basePath)}
              key={item.path}
              onClick={() => setQuery("")}
            >
              <span>{item.title}</span>
              <small>/{item.path}</small>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
};
