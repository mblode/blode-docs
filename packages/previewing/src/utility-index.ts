import { normalizePath, slugify } from "@repo/common";
import type { SiteConfig } from "@repo/models";

import {
  getDocsCollectionWithNavigation,
  getDocsNavigation,
} from "./config-loader.js";
import {
  PREBUILT_UTILITY_LLMS_FULL_PATH,
  PREBUILT_UTILITY_LLMS_PATH,
  PREBUILT_UTILITY_LLMS_SEGMENT_PREFIX,
  PREBUILT_UTILITY_SITEMAP_PATH,
  PREBUILT_UTILITY_SKILLS_INDEX_PATH,
  PREBUILT_UTILITY_SKILLS_MD_PREFIX,
  UTILITY_DOCS_ROOT_TOKEN,
} from "./constants.js";
import {
  buildPageMetadataMap,
  shouldIncludeSearchEntry,
} from "./content-index.js";
import type { ContentSource } from "./content-source.js";
import {
  prepareLlmsFullContent,
  toAgentMarkdown,
} from "./markdown/agent-markdown.js";
import {
  formatMarkdownPage,
  formatMarkdownPageSection,
  stripFrontmatter,
} from "./markdown/format.js";
import { buildUtilityOpenApiPages } from "./openapi-pages.js";
import type {
  ContentIndex,
  UtilityArtifact,
  UtilityIndex,
  UtilityPage,
  UtilitySegment,
} from "./types.js";

const collectUtilitySegments = (
  config: SiteConfig,
  pages: Map<string, UtilityPage>
): UtilitySegment[] => {
  const segments = new Map<string, UtilitySegment>();
  const addGroup = (group: {
    group?: string;
    hidden?: boolean;
    pages?: string[];
  }) => {
    if (group.hidden || !group.group) {
      return;
    }
    const pageSlugs = (group.pages ?? []).filter((page) => pages.has(page));
    if (pageSlugs.length === 0) {
      return;
    }
    const slug = slugify(group.group);
    segments.set(slug, { pageSlugs, slug, title: group.group });
  };

  const navigation = getDocsNavigation(config);
  for (const group of navigation?.groups ?? []) {
    addGroup(group);
  }
  for (const tab of navigation?.tabs ?? []) {
    for (const group of tab.groups ?? []) {
      addGroup(group);
    }
  }

  return [...segments.values()];
};

export const buildUtilityIndex = async (
  index: ContentIndex,
  source: ContentSource,
  config: SiteConfig
): Promise<UtilityIndex> => {
  const pageMetadataMap = buildPageMetadataMap(index);
  const pages = new Map<string, UtilityPage>();

  const contentPages = await Promise.all(
    index.entries.map(async (entry) => {
      if (entry.kind !== "entry") {
        return null;
      }
      if (!shouldIncludeSearchEntry(entry, pageMetadataMap, config)) {
        return null;
      }
      const rawContent = await source.readFile(entry.relativePath);
      return {
        content: stripFrontmatter(rawContent),
        description: entry.description,
        slug: entry.slug,
        title: entry.title,
      } satisfies UtilityPage;
    })
  );
  for (const page of contentPages) {
    if (page) {
      pages.set(page.slug, page);
    }
  }

  for (const page of await buildUtilityOpenApiPages(
    config,
    getDocsCollectionWithNavigation(config),
    source
  )) {
    pages.set(page.slug, page);
  }

  const sortedPages = [...pages.values()];
  // oxlint-disable-next-line eslint-plugin-unicorn/no-array-sort
  sortedPages.sort((left, right) => left.slug.localeCompare(right.slug));

  return {
    description: config.description,
    name: config.name,
    pages: sortedPages,
    segments: collectUtilitySegments(config, pages),
    slug: config.slug,
  };
};

const toUtilityDocPath = (value: string) => {
  const clean = normalizePath(value);
  // The index page is the docs root itself, which the root token already
  // carries. Returning "/" here would emit `https://host/docs/`, which
  // redirects to the canonical `https://host/docs`.
  if (!clean || clean === "index") {
    return "";
  }
  return `/${clean}`;
};

const toUtilityTemplatedDocUrl = (value: string) =>
  `${UTILITY_DOCS_ROOT_TOKEN}${toUtilityDocPath(value)}`;

const toUtilityTemplatedMarkdownDocUrl = (value: string) => {
  const clean = normalizePath(value);
  if (!clean || clean === "index") {
    return `${UTILITY_DOCS_ROOT_TOKEN}/index.md`;
  }
  return `${UTILITY_DOCS_ROOT_TOKEN}/${clean}.md`;
};

export const getPrebuiltUtilityLlmPagePath = (slug: string) => {
  const normalized = normalizePath(slug);
  return `_utility/llms-pages/${normalized || "index"}.mdx`;
};

export const buildUtilityArtifacts = (
  index: UtilityIndex,
  options: { publishedAt?: string } = {}
): UtilityArtifact[] => {
  const segments = index.segments ?? [];
  const segmentLines =
    segments.length > 0
      ? [
          "",
          "## Segments",
          ...segments.map(
            (segment) =>
              `- [${segment.title}](${UTILITY_DOCS_ROOT_TOKEN}/llms/${segment.slug}.txt)`
          ),
        ]
      : [];
  const llmsLines = [
    `# ${index.name}`,
    index.description ? `> ${index.description}` : null,
    "",
    `Sitemap: ${toUtilityTemplatedDocUrl("sitemap.xml")}`,
    `Full content: ${UTILITY_DOCS_ROOT_TOKEN}/llms-full.txt`,
    `Skills: ${UTILITY_DOCS_ROOT_TOKEN}/.well-known/skills/index.json`,
    ...segmentLines,
    "",
    "## Docs",
    ...index.pages.map((page) => {
      const description = page.description ? `: ${page.description}` : "";
      return `- [${page.title}](${toUtilityTemplatedMarkdownDocUrl(page.slug)})${description}`;
    }),
  ];

  // A publish rewrites every file, so the publish time is the last-modified
  // date of every page in this sitemap. Omitted when the caller does not supply
  // one: an absent `lastmod` reads as unknown, while a build or request time
  // teaches Google to ignore the field sitewide.
  const lastmod = options.publishedAt
    ? `<lastmod>${options.publishedAt}</lastmod>`
    : "";
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${index.pages
  .map(
    (page) =>
      `  <url><loc>${toUtilityTemplatedDocUrl(page.slug)}</loc>${lastmod}</url>`
  )
  .join("\n")}
</urlset>`;

  const llmsFull = index.pages
    .map((page) =>
      formatMarkdownPageSection(
        page.title,
        toUtilityTemplatedDocUrl(page.slug),
        prepareLlmsFullContent(page.content, UTILITY_DOCS_ROOT_TOKEN, ""),
        page.description
      )
    )
    .join("\n\n");

  const skillSlug = index.slug ?? slugify(index.name);
  const skillDescription =
    `${index.name} documentation. ${index.description ?? ""}`.trim();
  const skillsIndex = JSON.stringify(
    {
      skills: [
        {
          description: skillDescription,
          files: ["SKILL.md"],
          name: skillSlug,
        },
      ],
    },
    null,
    2
  );

  const topPages = index.pages.slice(0, 20);
  const skillMdLines = [
    "---",
    `name: ${skillSlug}`,
    `description: ${skillDescription} Use when working with ${index.name}, answering questions about its features, or helping users follow its guides.`,
    "---",
    "",
    `# ${index.name}`,
    "",
    index.description ? `${index.description}\n` : "",
    "## Documentation",
    "",
    `- Full docs index: ${UTILITY_DOCS_ROOT_TOKEN}/llms.txt`,
    `- Complete docs content: ${UTILITY_DOCS_ROOT_TOKEN}/llms-full.txt`,
    "- Append `.md` to any page URL for raw markdown",
    "",
    "## Key Pages",
    "",
    ...topPages.map((page) => {
      const desc = page.description ? ` - ${page.description}` : "";
      return `- [${page.title}](${toUtilityTemplatedMarkdownDocUrl(
        page.slug
      )})${desc}`;
    }),
  ];

  return [
    {
      content: sitemap,
      contentType: "application/xml; charset=utf-8",
      path: PREBUILT_UTILITY_SITEMAP_PATH,
    },
    {
      content: llmsLines.filter((line) => line !== null).join("\n"),
      contentType: "text/plain; charset=utf-8",
      path: PREBUILT_UTILITY_LLMS_PATH,
    },
    {
      content: llmsFull,
      contentType: "text/plain; charset=utf-8",
      path: PREBUILT_UTILITY_LLMS_FULL_PATH,
    },
    {
      content: skillsIndex,
      contentType: "application/json; charset=utf-8",
      path: PREBUILT_UTILITY_SKILLS_INDEX_PATH,
    },
    {
      content: skillMdLines.filter((line) => line !== null).join("\n"),
      contentType: "text/markdown; charset=utf-8",
      path: `${PREBUILT_UTILITY_SKILLS_MD_PREFIX}${skillSlug}/SKILL.md`,
    },
    ...segments.map((segment) => {
      const segmentPages = index.pages.filter((page) =>
        segment.pageSlugs.includes(page.slug)
      );
      const content = [
        `# ${index.name} - ${segment.title}`,
        `> Segment of ${UTILITY_DOCS_ROOT_TOKEN}/llms-full.txt`,
        "",
        ...segmentPages.map((page) =>
          formatMarkdownPageSection(
            page.title,
            toUtilityTemplatedDocUrl(page.slug),
            prepareLlmsFullContent(page.content, UTILITY_DOCS_ROOT_TOKEN, ""),
            page.description
          )
        ),
      ].join("\n\n");

      return {
        content,
        contentType: "text/plain; charset=utf-8",
        path: `${PREBUILT_UTILITY_LLMS_SEGMENT_PREFIX}${segment.slug}.txt`,
      };
    }),
    ...index.pages.map((page) => ({
      content: formatMarkdownPage(
        page.title,
        toAgentMarkdown(page.content),
        page.description
      ),
      contentType: "text/markdown; charset=utf-8",
      path: getPrebuiltUtilityLlmPagePath(page.slug),
    })),
  ];
};
