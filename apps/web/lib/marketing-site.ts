import type { Metadata } from "next";

export const MARKETING_ORIGIN = "https://blode.md";

export const SITE_NAME = "Blode.md";

/** `Product: what it does`, under 60 characters so the SERP does not clip it. */
export const HOME_TITLE = "Blode.md | Git-native MDX docs, published on merge";

/** Default meta description for the home page and root layout. */
export const HOME_DESCRIPTION =
  "Git-native MDX docs. I built this for people who already write MDX in git. No second editor. Hosted is $0. MIT if I disappear.";

/** Inner pages set a bare title and the root layout appends the product. */
export const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

/**
 * Canonical marketing pages and the date each was last materially changed.
 * Bump the date when the page's copy changes; it feeds the sitemap `lastmod`,
 * which Google only trusts when it moves with the content rather than with
 * every deploy.
 */
export const CANONICAL_PAGES = {
  "/": "2026-09-06",
  "/about": "2026-08-14",
  "/blog": "2026-08-14",
  "/changelog": "2026-08-14",
  "/compare/mintlify": "2026-09-06",
  "/free-online-llms-txt-resources": "2026-08-14",
  "/pricing": "2026-08-14",
  "/privacy": "2026-08-14",
  "/security": "2026-08-14",
  "/terms": "2026-08-14",
} as const;

export type CanonicalPath = keyof typeof CANONICAL_PAGES;

export const CANONICAL_PATHS = Object.keys(CANONICAL_PAGES) as CanonicalPath[];

export const marketingUrl = (path: string) => `${MARKETING_ORIGIN}${path}`;

/** Static 1200x630 cards in `app/`; declared here because pages replace `openGraph` wholesale. */
const OG_IMAGE = { height: 630, url: "/opengraph-image.png", width: 1200 };
const TWITTER_IMAGE = "/twitter-image.png";
export const TWITTER_CREATOR = "@mattblode";

/**
 * Page metadata with a canonical URL and `og:url`.
 *
 * `title` is the bare page name ("Pricing"), not the finished string: the root
 * layout's template appends the product. Next applies that template to `<title>`
 * only, so `og:title` is resolved here by hand. The home page is the exception
 * and carries the full site title absolutely.
 *
 * Next also replaces `openGraph` and `twitter` wholesale rather than merging
 * them, so a page that set only `url` would drop the site name, type, card
 * type, and the file-based images declared in the root layout. Building the
 * whole block here keeps every page complete.
 */
export const pageMetadata = ({
  description,
  path,
  title,
  type = "website",
}: {
  description: string;
  path: string;
  title: string;
  type?: "article" | "website";
}): Metadata => {
  const isHome = path === "/";
  return {
    alternates: { canonical: path },
    description,
    openGraph: {
      description,
      images: [OG_IMAGE],
      siteName: SITE_NAME,
      title: isHome ? title : `${title} | ${SITE_NAME}`,
      type,
      url: marketingUrl(path),
    },
    title: isHome ? { absolute: title } : title,
    twitter: {
      card: "summary_large_image",
      creator: TWITTER_CREATOR,
      images: [TWITTER_IMAGE],
    },
  };
};
