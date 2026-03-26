import { normalizePath } from "@repo/common";
import Link from "next/link";

import type { NavEntry } from "@/lib/navigation";
import { toDocHref } from "@/lib/routes";

export const DocSidebar = ({
  entries,
  currentPath,
  anchors,
  basePath,
}: {
  entries: NavEntry[];
  currentPath: string;
  anchors?: { label: string; href: string }[];
  basePath: string;
}) => {
  const activePath = normalizePath(currentPath);

  return (
    <aside className="doc-sidebar">
      {anchors?.length ? (
        <div className="doc-group">
          <div className="doc-group__title">Pinned</div>
          <div className="doc-group__items">
            {anchors.map((anchor) => (
              <a
                className="doc-link"
                href={
                  anchor.href.startsWith("http")
                    ? anchor.href
                    : toDocHref(anchor.href, basePath)
                }
                key={anchor.href}
              >
                {anchor.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
      {entries.map((entry) => {
        if (entry.type === "page") {
          return (
            <Link
              className={
                entry.path === activePath
                  ? "doc-link doc-link--active"
                  : "doc-link"
              }
              href={toDocHref(entry.path, basePath)}
              key={entry.path}
            >
              {entry.title}
            </Link>
          );
        }

        return (
          <div className="doc-group" key={entry.title}>
            <div className="doc-group__title">{entry.title}</div>
            <div className="doc-group__items">
              {entry.items.map((item) => (
                <Link
                  className={
                    item.path === activePath
                      ? "doc-link doc-link--active"
                      : "doc-link"
                  }
                  href={toDocHref(item.path, basePath)}
                  key={item.path}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </aside>
  );
};
