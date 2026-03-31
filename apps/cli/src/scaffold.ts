import path from "node:path";

import { slugify } from "@repo/common";

export const SCAFFOLD_TEMPLATES = ["minimal", "starter"] as const;
export type ScaffoldTemplate = (typeof SCAFFOLD_TEMPLATES)[number];
export const DEFAULT_SCAFFOLD_DIRECTORY = "docs";
export const DEFAULT_PROJECT_SLUG = "my-project";

interface BaseScaffoldFile {
  path: string;
}

interface TextScaffoldFile extends BaseScaffoldFile {
  content: string;
  type?: "file";
}

interface SymlinkScaffoldFile extends BaseScaffoldFile {
  fallbackContent: string;
  target: string;
  type: "symlink";
}

export type ScaffoldFile = TextScaffoldFile | SymlinkScaffoldFile;

const stringifyJson = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`;

export const isScaffoldTemplate = (value: string): value is ScaffoldTemplate =>
  SCAFFOLD_TEMPLATES.includes(value as ScaffoldTemplate);

const normalizeProjectSlug = (value: string) =>
  slugify(value) || DEFAULT_PROJECT_SLUG;

export const resolveScaffoldDirectory = (directory?: string) =>
  directory?.trim() || DEFAULT_SCAFFOLD_DIRECTORY;

export const deriveDefaultProjectSlug = (
  directory: string | undefined,
  cwd: string
) => {
  const resolvedDirectory = resolveScaffoldDirectory(directory);

  if (
    resolvedDirectory === "." ||
    resolvedDirectory === DEFAULT_SCAFFOLD_DIRECTORY
  ) {
    return normalizeProjectSlug(path.basename(cwd));
  }

  return normalizeProjectSlug(
    path.basename(path.resolve(cwd, resolvedDirectory))
  );
};

export const validateProjectSlug = (value: string | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "Project slug is required.";
  }

  const normalized = slugify(trimmed);
  if (!normalized) {
    return "Use at least one letter or number.";
  }

  if (normalized !== trimmed) {
    return `Use lowercase letters, numbers, and hyphens. Try "${normalized}".`;
  }
};

const createMinimalDocsJson = (projectSlug: string) => ({
  $schema: "https://blode.md/docs.json",
  name: projectSlug,
  navigation: {
    groups: [{ group: "Getting Started", pages: ["index"] }],
  },
});

const createStarterDocsJson = (projectSlug: string) => ({
  $schema: "https://blode.md/docs.json",
  appearance: { default: "system" },
  contextual: {
    options: ["copy", "view", "chatgpt", "claude"],
  },
  description: "Ship documentation from your terminal.",
  favicon: "/favicon.svg",
  logo: {
    alt: `${projectSlug} logo`,
    dark: "/logo/dark.svg",
    light: "/logo/light.svg",
  },
  metadata: { timestamp: true },
  name: projectSlug,
  navigation: {
    groups: [
      {
        group: "Getting Started",
        pages: ["index", "quickstart", "development"],
      },
    ],
  },
});

const claudeInstructions = [
  "> **First-time setup**: Customize this file for your project. Prompt the user to update terminology, style preferences, and content boundaries before drafting large amounts of docs.",
  "",
  "# Documentation project instructions",
  "",
  "## About this project",
  "",
  "- This is a documentation site built on [Blode.md](https://blode.md)",
  "- Pages are MDX files with YAML frontmatter",
  "- Configuration lives in `docs.json`",
  "- Run `blodemd dev` to preview locally",
  "- Run `blodemd validate` before publishing",
  "- Run `blodemd push` to deploy",
  "",
  "## Terminology",
  "",
  "{/* Add product-specific terms and preferred usage */}",
  '{/* Example: Use "workspace" not "project", "member" not "user" */}',
  "",
  "## Style preferences",
  "",
  "{/* Add any project-specific style rules below */}",
  "",
  '- Use active voice and second person ("you")',
  "- Keep sentences concise and task-oriented",
  "- Use sentence case for headings",
  "- Bold UI labels: Click **Settings**",
  "- Use code formatting for file names, commands, paths, JSON fields, and code references",
  "",
  "## Content boundaries",
  "",
  "{/* Define what should and shouldn't be documented */}",
  "{/* Example: Don't document internal admin features */}",
  "",
  "## Workflow reminders",
  "",
  "- Content lives in MDX files next to `docs.json`.",
  "- Update `docs.json` when navigation or branding changes.",
  "- Prefer concise, task-oriented documentation.",
  "- Run `blodemd validate` before publishing.",
  "",
].join("\n");

const createMinimalFiles = (projectSlug: string): ScaffoldFile[] => [
  {
    content: stringifyJson(createMinimalDocsJson(projectSlug)),
    path: "docs.json",
  },
  {
    content: "---\ntitle: Welcome\n---\n\nStart writing your docs here.\n",
    path: "index.mdx",
  },
];

const createStarterFiles = (projectSlug: string): ScaffoldFile[] => [
  {
    content: stringifyJson(createStarterDocsJson(projectSlug)),
    path: "docs.json",
  },
  {
    content: [
      "---",
      "title: Welcome",
      "description: Start here.",
      "---",
      "",
      "# Welcome",
      "",
      "This starter gives you branded assets, repo helper files, and a small docs structure you can rewrite quickly.",
      "",
      "![Starter illustration](images/hero-light.svg)",
      "",
      "## What is included",
      "",
      "- A starter `docs.json` with branding, contextual actions, and navigation.",
      "- Placeholder brand assets in `/logo` and `/images`.",
      "- Repo helper files like `.gitignore`, `README.md`, `AGENTS.md`, and `CLAUDE.md`.",
      "",
      "## Next steps",
      "",
      "- Confirm the `name` field in `docs.json` matches your project slug.",
      "- Set `description` in `docs.json` to explain your product.",
      "- Replace the files in `/logo` and `/images` with your own brand assets.",
      "- Rewrite `CLAUDE.md` with your terminology and writing standards.",
      "- Update this page, then preview locally with `blodemd dev`.",
      "",
      "## Included pages",
      "",
      "- [Quickstart](quickstart)",
      "- [Development](development)",
      "",
    ].join("\n"),
    path: "index.mdx",
  },
  {
    content: [
      "---",
      "title: Quickstart",
      "description: Get your docs running fast.",
      "---",
      "",
      "# Quickstart",
      "",
      "![Setup checklist](images/checks-passed.svg)",
      "",
      "1. Confirm the `name` field in `docs.json`.",
      "2. Update the `description` field to match your product.",
      "3. Replace the assets in `/logo` and `/images`.",
      "4. Run `blodemd dev` to preview locally.",
      "5. Run `blodemd push` when you are ready to publish.",
      "",
    ].join("\n"),
    path: "quickstart.mdx",
  },
  {
    content: [
      "---",
      "title: Development",
      "description: Work on your docs locally.",
      "---",
      "",
      "# Development",
      "",
      "![Dark preview illustration](images/hero-dark.svg)",
      "",
      "Preview locally with:",
      "",
      "```bash",
      "blodemd dev",
      "```",
      "",
      "Validate your configuration with:",
      "",
      "```bash",
      "blodemd validate",
      "```",
      "",
      "Keep `CLAUDE.md` current as your product terminology and writing rules evolve.",
      "",
    ].join("\n"),
    path: "development.mdx",
  },
  {
    content: [
      "# Documentation starter",
      "",
      "This directory was scaffolded with `blodemd new --template starter`.",
      "",
      "## What is included",
      "",
      "- `docs.json` with branding, contextual actions, and starter navigation",
      "- `index.mdx`, `quickstart.mdx`, and `development.mdx`",
      "- Placeholder brand assets in `/logo` and `/images`",
      "- Repo helper files: `.gitignore`, `README.md`, `AGENTS.md`, and `CLAUDE.md`",
      "",
      "## Commands",
      "",
      "```bash",
      "blodemd dev",
      "blodemd validate",
      "blodemd push",
      "```",
      "",
      "## Customize",
      "",
      "- Confirm the project slug and set the description in `docs.json`.",
      "- Replace the assets in `/logo` and `/images`.",
      "- Rewrite `CLAUDE.md` with project-specific terminology and writing rules.",
      "- Rewrite the starter pages to match your product.",
      "- Add a `LICENSE` file deliberately if this repo will be public.",
      "",
    ].join("\n"),
    path: "README.md",
  },
  {
    fallbackContent: claudeInstructions,
    path: "AGENTS.md",
    target: "CLAUDE.md",
    type: "symlink",
  },
  {
    content: claudeInstructions,
    path: "CLAUDE.md",
  },
  {
    content: [
      "# dependencies",
      "node_modules/",
      "",
      "# local env files",
      ".env*",
      "!.env.example",
      "",
      "# build and cache",
      ".next/",
      ".turbo/",
      "coverage/",
      "dist/",
      ".vercel/",
      "*.tsbuildinfo",
      "",
      "# logs",
      "*.log",
      "",
      "# misc",
      ".DS_Store",
      "",
    ].join("\n"),
    path: ".gitignore",
  },
  {
    content: [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">',
      '  <rect width="64" height="64" rx="16" fill="#0D9373"/>',
      '  <path d="M20 18h14c8.837 0 16 7.163 16 16s-7.163 16-16 16H20V18Z" fill="#CFF6EE"/>',
      '  <path d="M28 26h6c5.523 0 10 4.477 10 10s-4.477 10-10 10h-6V26Z" fill="#0C3A33"/>',
      "</svg>",
      "",
    ].join("\n"),
    path: "favicon.svg",
  },
  {
    content: [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 64" fill="none">',
      '  <rect width="64" height="64" rx="16" fill="#0C3A33"/>',
      '  <path d="M20 18h14c8.837 0 16 7.163 16 16s-7.163 16-16 16H20V18Z" fill="#CFF6EE"/>',
      `  <text x="84" y="41" fill="#111827" font-family="Arial, sans-serif" font-size="28" font-weight="700">${projectSlug}</text>`,
      "</svg>",
      "",
    ].join("\n"),
    path: "logo/light.svg",
  },
  {
    content: [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 64" fill="none">',
      '  <rect width="64" height="64" rx="16" fill="#CFF6EE"/>',
      '  <path d="M20 18h14c8.837 0 16 7.163 16 16s-7.163 16-16 16H20V18Z" fill="#0C3A33"/>',
      `  <text x="84" y="41" fill="#F9FAFB" font-family="Arial, sans-serif" font-size="28" font-weight="700">${projectSlug}</text>`,
      "</svg>",
      "",
    ].join("\n"),
    path: "logo/dark.svg",
  },
  {
    content: [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 520" fill="none">',
      '  <rect width="960" height="520" rx="32" fill="#F4FBF8"/>',
      '  <rect x="48" y="48" width="260" height="424" rx="24" fill="#E1F4EE"/>',
      '  <rect x="96" y="120" width="164" height="20" rx="10" fill="#0D9373" opacity=".25"/>',
      '  <rect x="96" y="164" width="132" height="16" rx="8" fill="#0D9373" opacity=".18"/>',
      '  <rect x="96" y="204" width="152" height="16" rx="8" fill="#0D9373" opacity=".18"/>',
      '  <rect x="356" y="80" width="556" height="104" rx="24" fill="#0D9373"/>',
      '  <rect x="388" y="116" width="220" height="18" rx="9" fill="#CFF6EE"/>',
      '  <rect x="388" y="148" width="156" height="14" rx="7" fill="#CFF6EE" opacity=".7"/>',
      '  <rect x="356" y="216" width="268" height="256" rx="24" fill="#FFFFFF"/>',
      '  <rect x="388" y="260" width="168" height="16" rx="8" fill="#0C3A33" opacity=".18"/>',
      '  <rect x="388" y="292" width="196" height="16" rx="8" fill="#0C3A33" opacity=".12"/>',
      '  <rect x="656" y="216" width="256" height="256" rx="24" fill="#0C3A33"/>',
      '  <rect x="692" y="260" width="128" height="16" rx="8" fill="#CFF6EE" opacity=".85"/>',
      '  <rect x="692" y="292" width="152" height="16" rx="8" fill="#CFF6EE" opacity=".45"/>',
      '  <circle cx="804" cy="380" r="52" fill="#0D9373"/>',
      "</svg>",
      "",
    ].join("\n"),
    path: "images/hero-light.svg",
  },
  {
    content: [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 520" fill="none">',
      '  <rect width="960" height="520" rx="32" fill="#071715"/>',
      '  <rect x="48" y="48" width="260" height="424" rx="24" fill="#0F2E28"/>',
      '  <rect x="96" y="120" width="164" height="20" rx="10" fill="#CFF6EE" opacity=".18"/>',
      '  <rect x="96" y="164" width="132" height="16" rx="8" fill="#CFF6EE" opacity=".14"/>',
      '  <rect x="96" y="204" width="152" height="16" rx="8" fill="#CFF6EE" opacity=".14"/>',
      '  <rect x="356" y="80" width="556" height="104" rx="24" fill="#0D9373"/>',
      '  <rect x="388" y="116" width="220" height="18" rx="9" fill="#E8FFF9"/>',
      '  <rect x="388" y="148" width="156" height="14" rx="7" fill="#E8FFF9" opacity=".6"/>',
      '  <rect x="356" y="216" width="268" height="256" rx="24" fill="#0C3A33"/>',
      '  <rect x="388" y="260" width="168" height="16" rx="8" fill="#CFF6EE" opacity=".22"/>',
      '  <rect x="388" y="292" width="196" height="16" rx="8" fill="#CFF6EE" opacity=".16"/>',
      '  <rect x="656" y="216" width="256" height="256" rx="24" fill="#E9FFF8"/>',
      '  <rect x="692" y="260" width="128" height="16" rx="8" fill="#0C3A33" opacity=".24"/>',
      '  <rect x="692" y="292" width="152" height="16" rx="8" fill="#0C3A33" opacity=".12"/>',
      '  <circle cx="804" cy="380" r="52" fill="#0D9373"/>',
      "</svg>",
      "",
    ].join("\n"),
    path: "images/hero-dark.svg",
  },
  {
    content: [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 520" fill="none">',
      '  <rect width="960" height="520" rx="32" fill="#F8FCFA"/>',
      '  <rect x="60" y="76" width="840" height="368" rx="28" fill="#FFFFFF" stroke="#D7ECE6" stroke-width="4"/>',
      '  <rect x="108" y="124" width="96" height="96" rx="24" fill="#0D9373"/>',
      '  <path d="M136 172l18 18 38-48" stroke="#CFF6EE" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
      '  <rect x="244" y="132" width="280" height="24" rx="12" fill="#0C3A33"/>',
      '  <rect x="244" y="176" width="416" height="18" rx="9" fill="#0C3A33" opacity=".16"/>',
      '  <rect x="244" y="214" width="340" height="18" rx="9" fill="#0C3A33" opacity=".12"/>',
      '  <rect x="108" y="280" width="744" height="22" rx="11" fill="#0D9373" opacity=".12"/>',
      '  <rect x="108" y="326" width="520" height="22" rx="11" fill="#0D9373" opacity=".12"/>',
      '  <rect x="108" y="372" width="612" height="22" rx="11" fill="#0D9373" opacity=".12"/>',
      "</svg>",
      "",
    ].join("\n"),
    path: "images/checks-passed.svg",
  },
];

export const getScaffoldFiles = (
  template: ScaffoldTemplate,
  options?: {
    projectSlug?: string;
  }
): ScaffoldFile[] => {
  const projectSlug = options?.projectSlug ?? DEFAULT_PROJECT_SLUG;
  return template === "starter"
    ? createStarterFiles(projectSlug)
    : createMinimalFiles(projectSlug);
};
