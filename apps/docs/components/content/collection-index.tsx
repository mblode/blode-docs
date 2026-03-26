import type { ContentEntry } from "@repo/previewing";
import Link from "next/link";

import { toDocHref } from "@/lib/routes";

type CollectionEntry = Extract<ContentEntry, { kind: "entry" }>;

const formatDate = (value?: string) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatPrice = (price?: number, currency?: string) => {
  if (price === undefined || !currency) {
    return null;
  }
  try {
    return new Intl.NumberFormat("en-US", {
      currency,
      style: "currency",
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
};

const buildMeta = (entry: CollectionEntry) => {
  const frontmatter = entry.frontmatter as Record<string, unknown>;
  switch (entry.type) {
    case "blog": {
      const date = formatDate(frontmatter.date as string | undefined);
      const tags = Array.isArray(frontmatter.tags)
        ? frontmatter.tags.join(", ")
        : null;
      return [date, tags ? `Tags: ${tags}` : null].filter(Boolean);
    }
    case "courses": {
      const order = frontmatter.order as number | undefined;
      return order !== undefined ? [`Lesson ${order}`] : [];
    }
    case "products": {
      const sku = frontmatter.sku as string | undefined;
      const price = formatPrice(
        frontmatter.price as number | undefined,
        frontmatter.currency as string | undefined
      );
      return [sku ? `SKU ${sku}` : null, price].filter(Boolean);
    }
    case "notes":
    case "todos": {
      const date = formatDate(frontmatter.date as string | undefined);
      return date ? [date] : [];
    }
    case "forms": {
      const fields = Array.isArray(frontmatter.fields)
        ? frontmatter.fields.length
        : null;
      return fields ? [`${fields} fields`] : [];
    }
    case "sheets": {
      const columns = Array.isArray(frontmatter.columns)
        ? frontmatter.columns.length
        : null;
      return columns ? [`${columns} columns`] : [];
    }
    default: {
      return [];
    }
  }
};

export const CollectionIndex = ({
  entries,
  basePath,
}: {
  entries: CollectionEntry[];
  basePath: string;
}) => (
  <div className="content-index">
    {entries.map((entry) => {
      const meta = buildMeta(entry);
      return (
        <Link
          className="content-index__item"
          href={toDocHref(entry.slug, basePath)}
          key={`${entry.collectionId}-${entry.slug}`}
        >
          <div className="content-index__title">{entry.title}</div>
          {entry.description ? (
            <p className="content-index__description">{entry.description}</p>
          ) : null}
          {meta.length ? (
            <div className="content-index__meta">{meta.join(" | ")}</div>
          ) : null}
          {entry.type === "slides" ? (
            <div className="content-index__meta">Slide deck</div>
          ) : null}
        </Link>
      );
    })}
  </div>
);
