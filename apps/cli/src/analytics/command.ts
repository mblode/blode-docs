import type { ProjectAnalytics } from "@repo/contracts";
import chalk from "chalk";
import type { Command } from "commander";

import { resolveAuthToken } from "../auth-session.js";
import { parseProjectSlug, reportCommandError } from "../command-utils.js";
import {
  BLODE_API_URL_ENV,
  BLODE_PROJECT_ENV,
  DEFAULT_API_URL,
} from "../constants.js";
import { resolveDocsRoot } from "../dev/resolve-root.js";
import { CliError, EXIT_CODES } from "../errors.js";
import { requestJson } from "../http.js";
import { createReporter } from "../output.js";
import type { Reporter } from "../output.js";
import {
  resolveProjectTarget,
  validateProjectSlug,
} from "../project-config.js";
import { loadValidatedSiteConfig } from "../site-config.js";
import {
  parsePosthogHost,
  parsePosthogProjectKey,
  parseProvider,
} from "./validators.js";

interface ProjectRecord {
  id: string;
  slug: string;
  name: string;
  analytics?: ProjectAnalytics | null;
}

interface CommonOptions {
  project?: string;
  apiUrl?: string;
  json?: boolean;
}

const apiBase = (options: CommonOptions): string =>
  options.apiUrl ?? process.env[BLODE_API_URL_ENV] ?? DEFAULT_API_URL;

const resolveAuthorization = async (): Promise<string> => {
  const resolved = await resolveAuthToken();
  if (!resolved?.token) {
    throw new CliError(
      'Not logged in. Run "blodemd login" to authenticate.',
      EXIT_CODES.AUTH_REQUIRED
    );
  }
  return `Bearer ${resolved.token}`;
};

const tryLoadDocsSlug = async (): Promise<string | undefined> => {
  try {
    const root = await resolveDocsRoot();
    const { config } = await loadValidatedSiteConfig(root);
    return config.slug ?? config.name;
  } catch {
    return undefined;
  }
};

// The slug is interpolated into an API path, so every source of it gets the
// same check `push` and `new` apply to theirs — the flag, the env var, and
// docs.json alike. A traversal segment fails here, before any request.
const assertValidSlug = (slug: string, source: string): string => {
  const validationError = validateProjectSlug(slug);
  if (validationError) {
    throw new CliError(
      `Invalid project slug "${slug}" from ${source}. ${validationError}`,
      EXIT_CODES.VALIDATION
    );
  }
  return slug.trim();
};

const resolveSlug = async (options: CommonOptions): Promise<string> => {
  if (options.project) {
    return assertValidSlug(options.project, "--project");
  }
  const envSlug = process.env[BLODE_PROJECT_ENV];
  if (envSlug) {
    return assertValidSlug(envSlug, BLODE_PROJECT_ENV);
  }
  const docsSlug = await tryLoadDocsSlug();
  const { project } = resolveProjectTarget({
    cliProject: undefined,
    config: { slug: docsSlug },
    envProject: undefined,
  });
  if (!project) {
    throw new CliError(
      "Could not resolve project. Pass --project <slug>, set BLODEMD_PROJECT, or run from a directory with docs.json.",
      EXIT_CODES.VALIDATION
    );
  }
  return assertValidSlug(project, "docs.json");
};

const getProjectBySlug = async (
  apiUrl: string,
  authorization: string,
  slug: string
): Promise<ProjectRecord> => {
  try {
    return await requestJson<ProjectRecord>(
      new URL(
        `/projects/by-slug/${encodeURIComponent(slug)}`,
        apiUrl
      ).toString(),
      { headers: { Authorization: authorization } },
      "Failed to fetch project"
    );
  } catch (error: unknown) {
    if (error instanceof CliError && error.status === 404) {
      throw new CliError(
        `Project "${slug}" not found or not accessible.`,
        error.exitCode,
        error.hint ?? undefined,
        { code: error.code, status: error.status }
      );
    }
    throw error;
  }
};

const patchAnalytics = async (
  apiUrl: string,
  authorization: string,
  projectId: string,
  analytics: ProjectAnalytics | null
): Promise<ProjectRecord> =>
  await requestJson<ProjectRecord>(
    new URL(`/projects/${encodeURIComponent(projectId)}`, apiUrl).toString(),
    {
      body: JSON.stringify({ analytics }),
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
    "Failed to update analytics"
  );

const normalizeAnalytics = (
  analytics: ProjectAnalytics | null | undefined
): ProjectAnalytics | null => {
  if (!analytics) {
    return null;
  }
  const next: ProjectAnalytics = {};
  if (analytics.posthog?.projectKey) {
    next.posthog = {
      projectKey: analytics.posthog.projectKey,
      ...(analytics.posthog.host ? { host: analytics.posthog.host } : {}),
    };
  }
  return next.posthog ? next : null;
};

// One shape for all three subcommands: a single JSON line on stdout when the
// caller is a machine, plain lines through the reporter when it is a human.
const reportAnalytics = (reporter: Reporter, project: ProjectRecord): void => {
  const analytics = normalizeAnalytics(project.analytics);
  reporter.json({ analytics, project: project.slug });
  reporter.info(`Project: ${chalk.cyan(project.slug)}`);
  if (!analytics) {
    reporter.info("  No analytics configured.");
    return;
  }
  if (analytics.posthog) {
    reporter.info(`  PostHog: ${chalk.cyan(analytics.posthog.projectKey)}`);
    if (analytics.posthog.host) {
      reporter.info(`           host: ${analytics.posthog.host}`);
    }
  }
};

const runGet = async (
  options: CommonOptions,
  reporter: Reporter
): Promise<void> => {
  const slug = await resolveSlug(options);
  const authorization = await resolveAuthorization();
  const project = await getProjectBySlug(apiBase(options), authorization, slug);
  reportAnalytics(reporter, project);
};

interface SetPosthogOptions extends CommonOptions {
  host?: string;
}

const runSetPosthog = async (
  projectKey: string,
  options: SetPosthogOptions,
  reporter: Reporter
): Promise<void> => {
  const slug = await resolveSlug(options);
  const authorization = await resolveAuthorization();
  const apiUrl = apiBase(options);
  const project = await getProjectBySlug(apiUrl, authorization, slug);
  const next = {
    ...normalizeAnalytics(project.analytics),
    posthog: {
      projectKey,
      ...(options.host ? { host: options.host } : {}),
    },
  } satisfies ProjectAnalytics;
  const updated = await patchAnalytics(apiUrl, authorization, project.id, next);
  reportAnalytics(reporter, updated);
  reporter.success(`Updated PostHog for ${chalk.cyan(updated.slug)}.`);
};

const runUnset = async (
  provider: "posthog",
  options: CommonOptions,
  reporter: Reporter
): Promise<void> => {
  const slug = await resolveSlug(options);
  const authorization = await resolveAuthorization();
  const apiUrl = apiBase(options);
  const project = await getProjectBySlug(apiUrl, authorization, slug);
  const next = normalizeAnalytics({
    ...project.analytics,
    [provider]: undefined,
  });
  const updated = await patchAnalytics(apiUrl, authorization, project.id, next);
  reportAnalytics(reporter, updated);
  reporter.success(`Removed ${provider} for ${chalk.cyan(updated.slug)}.`);
};

const runAction = async (
  label: string,
  options: CommonOptions,
  action: (reporter: Reporter) => Promise<void>
): Promise<void> => {
  const reporter = createReporter({ json: options.json });
  try {
    await action(reporter);
  } catch (error: unknown) {
    reportCommandError(label, error, { json: options.json });
  }
};

const JSON_OPTION_DESCRIPTION =
  "output machine-readable JSON (implies non-interactive)";
const PROJECT_OPTION_DESCRIPTION = "project slug (env: BLODEMD_PROJECT)";
const API_URL_OPTION_DESCRIPTION = "API URL (env: BLODEMD_API_URL)";

export const registerAnalyticsCommand = (program: Command): void => {
  const analytics = program
    .command("analytics")
    .description("Manage tenant analytics integrations (PostHog)");

  analytics
    .command("get")
    .description("Show the analytics config for a project")
    .option("--project <slug>", PROJECT_OPTION_DESCRIPTION, parseProjectSlug)
    .option("--api-url <url>", API_URL_OPTION_DESCRIPTION)
    .option("--json", JSON_OPTION_DESCRIPTION)
    .action(async (options: CommonOptions) => {
      await runAction("Analytics get failed", options, (reporter) =>
        runGet(options, reporter)
      );
    });

  const set = analytics
    .command("set")
    .description("Set an analytics integration");

  set
    .command("posthog")
    .description("Set the PostHog project key")
    .argument(
      "<projectKey>",
      "PostHog project key (phc_...)",
      parsePosthogProjectKey
    )
    .option(
      "--host <url>",
      "PostHog host (default: https://us.i.posthog.com)",
      parsePosthogHost
    )
    .option("--project <slug>", PROJECT_OPTION_DESCRIPTION, parseProjectSlug)
    .option("--api-url <url>", API_URL_OPTION_DESCRIPTION)
    .option("--json", JSON_OPTION_DESCRIPTION)
    .action(async (projectKey: string, options: SetPosthogOptions) => {
      await runAction("Set PostHog failed", options, (reporter) =>
        runSetPosthog(projectKey, options, reporter)
      );
    });

  analytics
    .command("unset")
    .description("Remove an analytics integration")
    .argument("<provider>", "provider to remove (posthog)", parseProvider)
    .option("--project <slug>", PROJECT_OPTION_DESCRIPTION, parseProjectSlug)
    .option("--api-url <url>", API_URL_OPTION_DESCRIPTION)
    .option("--json", JSON_OPTION_DESCRIPTION)
    .action(async (provider: "posthog", options: CommonOptions) => {
      await runAction("Unset failed", options, (reporter) =>
        runUnset(provider, options, reporter)
      );
    });
};
