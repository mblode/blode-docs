const MAX_TITLE_LENGTH = 60;

export interface BuildDocsSeoTitleInput {
  baseTitle: string;
  pageDescription?: string | null;
  pageTitle?: string | null;
  titleTemplate?: string | null;
}

const truncateAtWordBoundary = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }

  const ellipsis = "...";
  const budget = Math.max(maxLength - ellipsis.length, 1);
  const sliced = text.slice(0, budget);
  const lastSpace = sliced.lastIndexOf(" ");
  const trimmed = (
    lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced
  ).trimEnd();

  return `${trimmed}${ellipsis}`;
};

/**
 * Build a docs page SEO title: the page title plus the site suffix, kept under
 * ~60 characters so the SERP does not clip it.
 *
 * The page title stands alone. An earlier version appended the description when
 * the title was short, which produced clipped mash-ups like
 * `Quickstart: Install the Blode.md CLI,... · Blode.md` on nearly every page.
 * The description already has its own tag; the title's job is the page name.
 */
export const buildDocsSeoTitle = ({
  baseTitle,
  pageTitle,
  titleTemplate,
}: BuildDocsSeoTitleInput): string => {
  if (!pageTitle) {
    return baseTitle;
  }

  const template = titleTemplate?.includes("%s")
    ? titleTemplate
    : `%s · ${baseTitle}`;
  const suffixLength = template.replace("%s", "").length;
  const maxSegmentLength = Math.max(MAX_TITLE_LENGTH - suffixLength, 1);
  const pageSegment = truncateAtWordBoundary(pageTitle, maxSegmentLength);

  return template.replace("%s", pageSegment);
};
