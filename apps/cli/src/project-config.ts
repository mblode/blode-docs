import { slugify } from "@repo/common";

interface DocsProjectConfig {
  name?: string;
  slug?: string;
}

interface ResolvedProjectTarget {
  project?: string;
  usedLegacyNameFallback: boolean;
}

export const LEGACY_PROJECT_NAME_FALLBACK_WARNING =
  "docs.json.slug is recommended. Falling back to docs.json.name as the deployment slug is deprecated.";

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

export const deriveDisplayNameFromProjectSlug = (projectSlug: string) =>
  projectSlug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");

export const resolveProjectTarget = (options: {
  cliProject?: string;
  config: DocsProjectConfig;
  envProject?: string;
}): ResolvedProjectTarget => {
  if (options.cliProject) {
    return {
      project: options.cliProject,
      usedLegacyNameFallback: false,
    };
  }

  if (options.envProject) {
    return {
      project: options.envProject,
      usedLegacyNameFallback: false,
    };
  }

  if (options.config.slug) {
    return {
      project: options.config.slug,
      usedLegacyNameFallback: false,
    };
  }

  if (options.config.name) {
    return {
      project: options.config.name,
      usedLegacyNameFallback: true,
    };
  }

  return {
    project: undefined,
    usedLegacyNameFallback: false,
  };
};

export const getProjectSlugError = (project: string | undefined) => {
  if (!project) {
    return;
  }

  return validateProjectSlug(project);
};
