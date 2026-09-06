/**
 * Default Open Graph image URL for a docs site.
 *
 * Every docs deployment ships `opengraph-image.png` at its own root, and a
 * proxied site serves it under the same base path (`/docs/opengraph-image.png`,
 * `/allmd/docs/opengraph-image.png`). That is the only card URL guaranteed to
 * resolve for every tenant: the zone or apex above the docs is somebody else's
 * app, and whether it ships a generated `/opengraph-image` route or a static
 * PNG is not knowable from here. Advertising a URL that may 404 is worse than a
 * slightly less specific card.
 */
export const defaultOgImageUrl = (origin: string, basePath = "") => {
  const normalizedBase = basePath.replace(/\/+$/, "");
  return `${origin}${normalizedBase}/opengraph-image.png`;
};
