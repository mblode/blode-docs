export const MARKETING_ORIGIN = "https://blode.md";

export const CANONICAL_PATHS = [
  "/",
  "/about",
  "/blog",
  "/pricing",
  "/privacy",
  "/security",
  "/terms",
] as const;

export type CanonicalPath = (typeof CANONICAL_PATHS)[number];

export const marketingUrl = (path: string) => `${MARKETING_ORIGIN}${path}`;
