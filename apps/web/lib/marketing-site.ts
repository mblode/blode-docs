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

export const CANONICAL_PATHS = [
  "/",
  "/about",
  "/blog",
  "/changelog",
  "/compare/mintlify",
  "/free-online-llms-txt-resources",
  "/pricing",
  "/privacy",
  "/security",
  "/terms",
] as const;

export type CanonicalPath = (typeof CANONICAL_PATHS)[number];

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
