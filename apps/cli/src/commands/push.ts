import { confirm, intro, isCancel } from "@clack/prompts";
import chalk from "chalk";
import type { Command } from "commander";

import { resolveApiKeyCredential, resolveAuthToken } from "../auth-session.js";
import {
  collectFiles,
  readGitValue,
  reportCommandError,
} from "../command-utils.js";
import {
  BLODE_API_KEY_ENV,
  BLODE_API_URL_ENV,
  BLODE_BRANCH_ENV,
  BLODE_COMMIT_MESSAGE_ENV,
  BLODE_PROJECT_ENV,
  DEFAULT_API_URL,
} from "../constants.js";
import { resolveDocsRoot } from "../dev/resolve-root.js";
import { CliError, EXIT_CODES } from "../errors.js";
import { requestJson } from "../http.js";
import { createReporter } from "../output.js";
import type { Reporter } from "../output.js";
import {
  getProjectSlugError,
  LEGACY_PROJECT_NAME_FALLBACK_WARNING,
  resolveProjectTarget,
} from "../project-config.js";
import { loadValidatedSiteConfig } from "../site-config.js";
import type { DeploymentResponse } from "../types.js";
import { createUploadBatches } from "../upload.js";

interface PushOptions {
  apiKey?: string;
  apiUrl?: string;
  branch?: string;
  dryRun?: boolean;
  json?: boolean;
  message?: string;
  project?: string;
  yes?: boolean;
}

/** Everything the push target is made of, before any credential is resolved. */
interface PushTarget {
  apiUrl: string;
  branch: string;
  commitMessage?: string;
  project: string;
  projectDisplayName: string;
  usedLegacyNameFallback: boolean;
}

export interface PushDryRunPayload {
  apiUrl: string;
  branch: string;
  commitMessage: string | null;
  dryRun: true;
  fileCount: number;
  project: string;
  root: string;
}

/**
 * A clack prompt needs a real terminal on *both* ends. An agent commonly runs
 * with piped stdin and an inherited TTY stdout: guarding on stdout alone would
 * reach the prompt and then block forever on a read that can never be answered.
 */
export const canPromptForConfirmation = (
  reporterInteractive: boolean
): boolean =>
  reporterInteractive &&
  process.stdin.isTTY === true &&
  process.stdout.isTTY === true;

/** Every cancel path exits non-zero so a CI gate cannot read it as success. */
const reportCancelled = (reporter: Reporter): void => {
  process.exitCode = EXIT_CODES.CANCELLED;
  reporter.info("Cancelled");
};

export const buildDryRunPayload = (input: {
  apiUrl: string;
  branch: string;
  commitMessage?: string;
  fileCount: number;
  project: string;
  root: string;
}): PushDryRunPayload => ({
  apiUrl: input.apiUrl,
  branch: input.branch,
  commitMessage: input.commitMessage ?? null,
  dryRun: true,
  fileCount: input.fileCount,
  project: input.project,
  root: input.root,
});

// Resolve auth in the documented order: --api-key flag, BLODEMD_API_KEY env,
// then stored `blodemd login` credentials. A project-scoped deploy key and a
// stored session both authenticate via a bearer token; only sessions may
// auto-create projects.
const resolveAuthHeaders = async (
  apiKeyOption?: string
): Promise<{ headers: Record<string, string>; canAutoCreate: boolean }> => {
  const apiKey = resolveApiKeyCredential(apiKeyOption);
  if (apiKey) {
    return {
      canAutoCreate: false,
      headers: { Authorization: `Bearer ${apiKey}` },
    };
  }

  const resolved = await resolveAuthToken();
  if (!resolved?.token) {
    throw new Error(
      'Not logged in. Run "blodemd login" to authenticate, pass --api-key, or set BLODEMD_API_KEY (see https://blode.md/docs/deployment/ci).'
    );
  }

  return {
    canAutoCreate: true,
    headers: { Authorization: `Bearer ${resolved.token}` },
  };
};

// Deliberately credential-free so `--dry-run` can reuse it: resolving a stored
// session may refresh and rewrite the token on disk, which a dry run must not do.
const resolvePushTarget = (
  config: { name?: string; slug?: string },
  options: PushOptions
): PushTarget => {
  const { project, usedLegacyNameFallback } = resolveProjectTarget({
    cliProject: options.project,
    config,
    envProject: process.env[BLODE_PROJECT_ENV],
  });
  const apiUrl =
    options.apiUrl ?? process.env[BLODE_API_URL_ENV] ?? DEFAULT_API_URL;

  const branch =
    options.branch ??
    process.env[BLODE_BRANCH_ENV] ??
    process.env.GITHUB_REF_NAME ??
    readGitValue(["rev-parse", "--abbrev-ref", "HEAD"]) ??
    "main";
  const commitMessage =
    options.message ??
    process.env[BLODE_COMMIT_MESSAGE_ENV] ??
    readGitValue(["log", "-1", "--pretty=%s"]);

  if (!project) {
    throw new Error(
      'Missing project slug. Set "slug" in docs.json, pass --project, or set BLODEMD_PROJECT.'
    );
  }

  const projectSlugError = getProjectSlugError(project);
  if (projectSlugError) {
    if (usedLegacyNameFallback) {
      throw new Error(
        `docs.json.name is not a valid deployment slug. Add "slug" to docs.json, pass --project, or set BLODEMD_PROJECT. ${projectSlugError}`
      );
    }

    throw new Error(`Invalid project slug "${project}". ${projectSlugError}`);
  }

  return {
    apiUrl,
    branch,
    commitMessage,
    project,
    projectDisplayName: config.name?.trim() || project,
    usedLegacyNameFallback,
  };
};

const autoCreateProject = async (params: {
  apiUrl: string;
  canAutoCreate: boolean;
  headers: Record<string, string>;
  project: string;
  projectDisplayName: string;
  reporter: Reporter;
  yes: boolean;
}): Promise<boolean> => {
  const { apiUrl, canAutoCreate, headers, project, reporter, yes } = params;

  if (!canAutoCreate) {
    throw new Error(
      `Project "${project}" not found. Create it at blode.md or login with "blodemd login" to auto-create.`
    );
  }

  // Auto-create mutates the account: it creates a project and mints a deploy
  // key. Without --yes that needs an answerable prompt, which requires a real
  // terminal on stdin and stdout. Otherwise fail deterministically.
  if (!(yes || canPromptForConfirmation(reporter.interactive))) {
    throw new Error(
      `Project "${project}" not found. Create it in the dashboard, re-run with --yes to create it automatically, or run \`blodemd push\` in an interactive terminal.`
    );
  }

  if (!yes) {
    const shouldCreate = await confirm({
      message: `Project "${project}" doesn't exist. Create it?`,
    });

    if (isCancel(shouldCreate) || !shouldCreate) {
      return false;
    }
  }

  const createResult = await requestJson<{ id: string; slug: string }>(
    new URL("/projects", apiUrl).toString(),
    {
      body: JSON.stringify({
        name: params.projectDisplayName,
        slug: project,
      }),
      headers,
      method: "POST",
    },
    "Failed to create project"
  );

  reporter.success(`Project ${chalk.cyan(createResult.slug)} created`);

  // Mint a project-scoped deploy key so the new project is CI-ready. The
  // plaintext key is only returned once, so surface it immediately.
  const keyResult = await requestJson<{ key: string }>(
    new URL(`/projects/${createResult.id}/keys`, apiUrl).toString(),
    {
      body: JSON.stringify({ name: "CI deploy key" }),
      headers,
      method: "POST",
    },
    "Failed to create deploy key"
  );

  reporter.info(
    `Deploy key created (save this — shown once, use as ${BLODE_API_KEY_ENV} in CI): ${chalk.cyan(keyResult.key)}`
  );
  return true;
};

// 4 MB limit keeps each batch well under Vercel's 4.5 MB serverless body cap
const MAX_BATCH_BYTES = 4 * 1024 * 1024;

const uploadFiles = async (
  files: string[],
  root: string,
  apiPath: (suffix: string) => string,
  deploymentId: string,
  headers: Record<string, string>,
  reporter: Reporter
) => {
  reporter.step(`Uploading ${files.length} files`);

  let uploaded = 0;
  for await (const batch of createUploadBatches({
    files,
    maxBatchBytes: MAX_BATCH_BYTES,
    root,
  })) {
    await requestJson(
      apiPath(`/${deploymentId}/files/batch`),
      {
        body: JSON.stringify({ files: batch }),
        headers,
        method: "POST",
      },
      "Failed to upload files"
    );
    uploaded += batch.length;
    reporter.step(`Uploading files (${uploaded}/${files.length})`);
  }

  reporter.success(`Uploaded ${chalk.cyan(String(files.length))} files`);
};

const collectDeployableFiles = async (
  root: string,
  reporter: Reporter
): Promise<string[]> => {
  reporter.step("Collecting files");
  const files = await collectFiles(root);
  if (files.length === 0) {
    throw new Error("No files found to deploy.");
  }
  reporter.success(`Found ${chalk.cyan(String(files.length))} files`);
  return files;
};

const validateAndResolve = async (
  dir: string | undefined,
  options: PushOptions,
  reporter: Reporter
): Promise<{ root: string; target: PushTarget }> => {
  const root = await resolveDocsRoot(dir);

  reporter.step("Validating configuration");
  const { config, warnings } = await loadValidatedSiteConfig(root);
  reporter.success("Configuration valid");
  for (const warning of warnings) {
    reporter.warn(warning);
  }

  const target = resolvePushTarget(config, options);
  // The config loader emits the identical warning, so only add it when it did
  // not — otherwise the operator sees the same deprecation line twice.
  if (
    target.usedLegacyNameFallback &&
    !warnings.includes(LEGACY_PROJECT_NAME_FALLBACK_WARNING)
  ) {
    reporter.warn(LEGACY_PROJECT_NAME_FALLBACK_WARNING);
  }

  return { root, target };
};

const runDryRun = async (
  dir: string | undefined,
  options: PushOptions,
  reporter: Reporter
): Promise<void> => {
  const { root, target } = await validateAndResolve(dir, options, reporter);
  const files = await collectDeployableFiles(root, reporter);

  const payload = buildDryRunPayload({
    apiUrl: target.apiUrl,
    branch: target.branch,
    commitMessage: target.commitMessage,
    fileCount: files.length,
    project: target.project,
    root,
  });

  reporter.info(
    `Dry run: would deploy ${chalk.cyan(String(payload.fileCount))} files to project ${chalk.cyan(payload.project)} on branch ${chalk.cyan(payload.branch)}`
  );
  reporter.info("Dry run: nothing was created, uploaded, or published");
  reporter.json(payload);
};

const runPush = async (
  dir: string | undefined,
  options: PushOptions,
  reporter: Reporter
): Promise<void> => {
  const { root, target } = await validateAndResolve(dir, options, reporter);
  const { apiUrl, branch, commitMessage, project, projectDisplayName } = target;
  const { headers: authHeaders, canAutoCreate } = await resolveAuthHeaders(
    options.apiKey
  );

  const files = await collectDeployableFiles(root, reporter);

  const headers = {
    ...authHeaders,
    "Content-Type": "application/json",
  };

  const apiPath = (suffix: string): string =>
    new URL(
      `/projects/slug/${project}/deployments${suffix}`,
      apiUrl
    ).toString();

  const createDeploymentBody = JSON.stringify({ branch, commitMessage });

  // Try creating the deployment — if 404, offer to create the project
  reporter.step("Creating deployment");
  let deployment: DeploymentResponse;
  try {
    deployment = await requestJson<DeploymentResponse>(
      apiPath(""),
      { body: createDeploymentBody, headers, method: "POST" },
      "Failed to create deployment"
    );
  } catch (error: unknown) {
    // The transport throws a typed CliError carrying the HTTP status, so a
    // 404 is a status check rather than a substring search over the message.
    if (!(error instanceof CliError && error.status === 404)) {
      throw error;
    }

    reporter.stop("Project not found");

    const created = await autoCreateProject({
      apiUrl,
      canAutoCreate,
      headers,
      project,
      projectDisplayName,
      reporter,
      yes: options.yes === true,
    });
    if (!created) {
      reportCancelled(reporter);
      return;
    }

    reporter.step("Creating deployment");
    deployment = await requestJson<DeploymentResponse>(
      apiPath(""),
      { body: createDeploymentBody, headers, method: "POST" },
      "Failed to create deployment"
    );
  }
  reporter.success(`Deployment ${chalk.cyan(deployment.id)} created`);

  await uploadFiles(files, root, apiPath, deployment.id, headers, reporter);

  reporter.step("Finalizing deployment");
  const finalized = await requestJson<DeploymentResponse>(
    apiPath(`/${deployment.id}/finalize`),
    {
      body: JSON.stringify({ promote: true }),
      headers,
      method: "POST",
    },
    "Failed to finalize deployment"
  );
  reporter.success("Deployment finalized");

  reporter.success(`Published ${chalk.cyan(finalized.id)}`);
  if (finalized.manifestUrl) {
    reporter.info(`Manifest: ${finalized.manifestUrl}`);
  }
  if (typeof finalized.fileCount === "number") {
    reporter.info(`Files: ${finalized.fileCount}`);
  }

  reporter.info("Done");

  reporter.json({
    deploymentId: finalized.id,
    fileCount: finalized.fileCount ?? files.length,
    manifestUrl: finalized.manifestUrl ?? null,
  });
};

const DRY_RUN_HELP = `
Dry run:
  --dry-run validates docs.json, resolves the project and branch, and reports
  the file count that would be deployed. It writes nothing: no project is
  created, no deploy key is minted, no deployment is created, and no file is
  uploaded. It needs no credentials and calls no API.
`;

export const registerPushCommand = (program: Command): void => {
  program
    .command("push")
    .description("Deploy docs")
    .argument("[dir]", "docs directory")
    .option("--project <slug>", "project slug (env: BLODEMD_PROJECT)")
    .option("--api-key <token>", "API key (env: BLODEMD_API_KEY)")
    .option("--api-url <url>", "API URL (env: BLODEMD_API_URL)")
    .option("--branch <name>", "git branch (env: BLODEMD_BRANCH)")
    .option("--message <msg>", "deploy message (env: BLODEMD_COMMIT_MESSAGE)")
    .option(
      "--dry-run",
      "preview only: report the target project, branch, and file count, then exit without writing anything"
    )
    .option(
      "-y, --yes",
      "create the project without prompting if it does not exist"
    )
    .option("--json", "output machine-readable JSON (implies non-interactive)")
    .addHelpText("after", DRY_RUN_HELP)
    .action(async (dir: string | undefined, options: PushOptions) => {
      const reporter = createReporter({ json: options.json });
      if (reporter.interactive) {
        intro(chalk.bold("blodemd push"));
      }

      try {
        if (options.dryRun) {
          await runDryRun(dir, options, reporter);
          return;
        }

        await runPush(dir, options, reporter);
      } catch (error: unknown) {
        reporter.stop("Failed");
        reportCommandError("Push failed", error, { json: options.json });
      }
    });
};
