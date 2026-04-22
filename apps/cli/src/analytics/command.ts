import { log } from "@clack/prompts";
import type { ProjectAnalytics } from "@repo/contracts";
import chalk from "chalk";
import type { Command } from "commander";

import { resolveAuthToken } from "../auth-session.js";
import {
  BLODE_API_URL_ENV,
  BLODE_PROJECT_ENV,
  DEFAULT_API_URL,
} from "../constants.js";
import { resolveDocsRoot } from "../dev/resolve-root.js";
import { CliError, EXIT_CODES, toCliError } from "../errors.js";
import { resolveProjectTarget } from "../project-config.js";
import { loadValidatedSiteConfig } from "../site-config.js";
import {
  parseGa4MeasurementId,
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

const resolveSlug = async (options: CommonOptions): Promise<string> => {
  if (options.project) {
    return options.project;
  }
  const envSlug = process.env[BLODE_PROJECT_ENV];
  if (envSlug) {
    return envSlug;
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
  return project;
};

const getProjectBySlug = async (
  apiUrl: string,
  authorization: string,
  slug: string
): Promise<ProjectRecord> => {
  const response = await fetch(`${apiUrl}/projects/by-slug/${slug}`, {
    headers: { Authorization: authorization },
  });
  if (response.status === 404) {
    throw new CliError(
      `Project "${slug}" not found or not accessible.`,
      EXIT_CODES.ERROR
    );
  }
  if (!response.ok) {
    throw new CliError(
      `Failed to fetch project: ${response.status} ${await response.text()}`,
      EXIT_CODES.ERROR
    );
  }
  return (await response.json()) as ProjectRecord;
};

const patchAnalytics = async (
  apiUrl: string,
  authorization: string,
  projectId: string,
  analytics: ProjectAnalytics | null
): Promise<ProjectRecord> => {
  const response = await fetch(`${apiUrl}/projects/${projectId}`, {
    body: JSON.stringify({ analytics }),
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  if (!response.ok) {
    throw new CliError(
      `Failed to update analytics: ${response.status} ${await response.text()}`,
      EXIT_CODES.ERROR
    );
  }
  return (await response.json()) as ProjectRecord;
};

const normalizeAnalytics = (
  analytics: ProjectAnalytics | null | undefined
): ProjectAnalytics | null => {
  if (!analytics) {
    return null;
  }
  const next: ProjectAnalytics = {};
  if (analytics.ga4?.measurementId) {
    next.ga4 = { measurementId: analytics.ga4.measurementId };
  }
  if (analytics.posthog?.projectKey) {
    next.posthog = {
      projectKey: analytics.posthog.projectKey,
      ...(analytics.posthog.host ? { host: analytics.posthog.host } : {}),
    };
  }
  return next.ga4 || next.posthog ? next : null;
};

const printAnalytics = (
  project: ProjectRecord,
  format: "text" | "json"
): void => {
  const analytics = normalizeAnalytics(project.analytics);
  if (format === "json") {
    process.stdout.write(
      `${JSON.stringify({ analytics, project: project.slug }, null, 2)}\n`
    );
    return;
  }
  log.info(`Project: ${chalk.cyan(project.slug)}`);
  if (!analytics) {
    log.info("  No analytics configured.");
    return;
  }
  if (analytics.ga4) {
    log.info(`  GA4:     ${chalk.cyan(analytics.ga4.measurementId)}`);
  }
  if (analytics.posthog) {
    log.info(`  PostHog: ${chalk.cyan(analytics.posthog.projectKey)}`);
    if (analytics.posthog.host) {
      log.info(`           host: ${analytics.posthog.host}`);
    }
  }
};

interface GetOptions extends CommonOptions {
  json?: boolean;
}

const runGet = async (options: GetOptions) => {
  const authorization = await resolveAuthorization();
  const apiUrl = apiBase(options);
  const slug = await resolveSlug(options);
  const project = await getProjectBySlug(apiUrl, authorization, slug);
  printAnalytics(project, options.json ? "json" : "text");
};

const runSetGa4 = async (measurementId: string, options: CommonOptions) => {
  const authorization = await resolveAuthorization();
  const apiUrl = apiBase(options);
  const slug = await resolveSlug(options);
  const project = await getProjectBySlug(apiUrl, authorization, slug);
  const next = {
    ...project.analytics,
    ga4: { measurementId },
  } satisfies ProjectAnalytics;
  const updated = await patchAnalytics(apiUrl, authorization, project.id, next);
  log.success(`Updated GA4 for ${chalk.cyan(updated.slug)}.`);
  printAnalytics(updated, "text");
};

interface SetPosthogOptions extends CommonOptions {
  host?: string;
}

const runSetPosthog = async (
  projectKey: string,
  options: SetPosthogOptions
) => {
  const authorization = await resolveAuthorization();
  const apiUrl = apiBase(options);
  const slug = await resolveSlug(options);
  const project = await getProjectBySlug(apiUrl, authorization, slug);
  const next = {
    ...project.analytics,
    posthog: {
      projectKey,
      ...(options.host ? { host: options.host } : {}),
    },
  } satisfies ProjectAnalytics;
  const updated = await patchAnalytics(apiUrl, authorization, project.id, next);
  log.success(`Updated PostHog for ${chalk.cyan(updated.slug)}.`);
  printAnalytics(updated, "text");
};

const runUnset = async (
  provider: "ga4" | "posthog",
  options: CommonOptions
) => {
  const authorization = await resolveAuthorization();
  const apiUrl = apiBase(options);
  const slug = await resolveSlug(options);
  const project = await getProjectBySlug(apiUrl, authorization, slug);
  const next = normalizeAnalytics({
    ...project.analytics,
    [provider]: undefined,
  });
  const updated = await patchAnalytics(apiUrl, authorization, project.id, next);
  log.success(
    `Removed ${provider.toUpperCase()} for ${chalk.cyan(updated.slug)}.`
  );
  printAnalytics(updated, "text");
};

const runAction = async (
  label: string,
  action: () => Promise<void>
): Promise<void> => {
  try {
    await action();
  } catch (error: unknown) {
    const cliError = toCliError(error);
    log.error(`${label}: ${cliError.message}`);
    if (cliError.hint) {
      log.info(cliError.hint);
    }
    process.exitCode = cliError.exitCode;
  }
};

export const registerAnalyticsCommand = (program: Command): void => {
  const analytics = program
    .command("analytics")
    .description("Manage tenant analytics integrations (GA4, PostHog)");

  analytics
    .command("get")
    .description("Show the analytics config for a project")
    .option("--project <slug>", "project slug (env: BLODEMD_PROJECT)")
    .option("--api-url <url>", "API URL (env: BLODEMD_API_URL)")
    .option("--json", "print as JSON")
    .action(async (options: GetOptions) => {
      await runAction("Analytics get failed", () => runGet(options));
    });

  const set = analytics
    .command("set")
    .description("Set an analytics integration");

  set
    .command("ga4")
    .description("Set the Google Analytics 4 measurement ID")
    .argument(
      "<measurementId>",
      "GA4 measurement ID (G-XXXXXXXXXX)",
      parseGa4MeasurementId
    )
    .option("--project <slug>", "project slug (env: BLODEMD_PROJECT)")
    .option("--api-url <url>", "API URL (env: BLODEMD_API_URL)")
    .action(async (measurementId: string, options: CommonOptions) => {
      await runAction("Set GA4 failed", () =>
        runSetGa4(measurementId, options)
      );
    });

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
    .option("--project <slug>", "project slug (env: BLODEMD_PROJECT)")
    .option("--api-url <url>", "API URL (env: BLODEMD_API_URL)")
    .action(async (projectKey: string, options: SetPosthogOptions) => {
      await runAction("Set PostHog failed", () =>
        runSetPosthog(projectKey, options)
      );
    });

  analytics
    .command("unset")
    .description("Remove an analytics integration")
    .argument("<provider>", "provider to remove (ga4 | posthog)", parseProvider)
    .option("--project <slug>", "project slug (env: BLODEMD_PROJECT)")
    .option("--api-url <url>", "API URL (env: BLODEMD_API_URL)")
    .action(async (provider: "ga4" | "posthog", options: CommonOptions) => {
      await runAction("Unset failed", () => runUnset(provider, options));
    });
};
