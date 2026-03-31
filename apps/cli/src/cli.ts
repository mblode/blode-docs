import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import {
  confirm,
  intro,
  isCancel,
  log,
  password,
  select,
  spinner,
  text,
} from "@clack/prompts";
import { shouldIgnoreRootDocsFile } from "@repo/common";
import chalk from "chalk";
import { Command, InvalidArgumentError } from "commander";
import open from "open";

import { resolveAuthToken, resolveTokenStatus } from "./auth-session.js";
import {
  BLODE_API_URL_ENV,
  BLODE_BRANCH_ENV,
  BLODE_COMMIT_MESSAGE_ENV,
  CREDENTIALS_FILE,
  BLODE_PROJECT_ENV,
  DEFAULT_API_URL,
  DEFAULT_OAUTH_CALLBACK_PATH,
  DEFAULT_OAUTH_CALLBACK_PORT,
  DEFAULT_OAUTH_TIMEOUT_SECONDS,
  OAUTH_CLIENT_ID,
} from "./constants.js";
import { devCommand } from "./dev/command.js";
import { resolveDocsRoot } from "./dev/resolve-root.js";
import { toCliError } from "./errors.js";
import {
  findExistingPaths,
  writeFileIfMissing,
  writeSymlinkIfMissing,
} from "./fs-utils.js";
import {
  CANCEL_SCAFFOLD,
  CREATE_IN_SUBDIRECTORY,
  resolveDirectoryFromAction,
  resolveInitialDirectory,
  SCAFFOLD_CURRENT_DIRECTORY,
} from "./new-flow.js";
import type { NoArgInteractiveAction } from "./new-flow.js";
import { waitForOAuthCode } from "./oauth-callback.js";
import { exchangeAuthorizationCode } from "./oauth-token.js";
import {
  createCodeChallenge,
  createCodeVerifier,
  createOAuthState,
} from "./pkce.js";
import { assertSupportedNodeVersion, readCliVersion } from "./runtime.js";
import {
  DEFAULT_SCAFFOLD_DIRECTORY,
  deriveDefaultProjectSlug,
  getScaffoldFiles,
  isScaffoldTemplate,
  resolveScaffoldDirectory,
  SCAFFOLD_TEMPLATES,
  validateProjectSlug,
} from "./scaffold.js";
import type { ScaffoldTemplate } from "./scaffold.js";
import { loadValidatedSiteConfig } from "./site-config.js";
import {
  clearStoredCredentials,
  readAuthFile,
  writeStoredApiKey,
  writeStoredAuthSession,
} from "./storage.js";
import {
  buildOAuthUrls,
  resolveSupabaseConfig,
  tokenResponseToStoredSession,
} from "./supabase.js";
import type { DeploymentResponse } from "./types.js";
import { createUploadBatches } from "./upload.js";
import { parsePort, parsePositiveInteger } from "./validation.js";

const CONFIG_FILE = "docs.json";

// --- File helpers ---

const readGitValue = (gitArgs: string[]): string | undefined => {
  const result = spawnSync("git", gitArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (result.status !== 0) {
    return;
  }

  const value = result.stdout.trim();
  return value || undefined;
};

const shouldSkipEntry = (name: string): boolean =>
  name.startsWith(".") || name === "node_modules";

const collectFiles = async (
  root: string,
  directory = root
): Promise<string[]> => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (shouldSkipEntry(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    const relativePath = path
      .relative(root, absolutePath)
      .split(path.sep)
      .join("/");
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(root, absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      if (shouldIgnoreRootDocsFile(relativePath)) {
        continue;
      }
      files.push(absolutePath);
    }
  }

  return files.toSorted((left, right) => left.localeCompare(right));
};

const readJson = async (response: Response): Promise<unknown> => {
  const responseText = await response.text();
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
};

const requestJson = async <T>(
  url: string,
  init: RequestInit,
  message: string
): Promise<T> => {
  const response = await fetch(url, init);
  const data = await readJson(response);
  if (!response.ok) {
    const detail =
      typeof data === "string" ? data : JSON.stringify(data ?? {}, null, 2);
    throw new Error(`${message}: ${response.status} ${detail}`);
  }

  return data as T;
};

const reportCommandError = (prefix: string, error: unknown): void => {
  const cliError = toCliError(error);

  log.error(`${prefix}: ${cliError.message}`);
  if (cliError.hint) {
    log.info(cliError.hint);
  }
  log.info("Failed");
  process.exitCode = cliError.exitCode;
};

const parseScaffoldTemplate = (value: string): ScaffoldTemplate => {
  if (isScaffoldTemplate(value)) {
    return value;
  }

  throw new InvalidArgumentError(
    `Expected one of: ${SCAFFOLD_TEMPLATES.join(", ")}.`
  );
};

const parseProjectSlug = (value: string): string => {
  const validationError = validateProjectSlug(value);

  if (validationError) {
    throw new InvalidArgumentError(validationError);
  }

  return value.trim();
};

const isInteractiveTerminal = () =>
  process.stdin.isTTY === true && process.stdout.isTTY === true;

const promptForNoArgDirectoryAction = async (): Promise<
  NoArgInteractiveAction | undefined
> => {
  const directoryAction = await select<NoArgInteractiveAction>({
    initialValue: CREATE_IN_SUBDIRECTORY,
    message: "Directory . is not empty. What would you like to do?",
    options: [
      {
        hint: "recommended",
        label: "Create in a subdirectory",
        value: CREATE_IN_SUBDIRECTORY,
      },
      {
        hint: "scaffold here",
        label: "Scaffold current directory",
        value: SCAFFOLD_CURRENT_DIRECTORY,
      },
      {
        label: "Cancel",
        value: CANCEL_SCAFFOLD,
      },
    ],
  });

  if (isCancel(directoryAction)) {
    return;
  }

  return directoryAction;
};

const promptForSubdirectoryName = async (): Promise<string | undefined> => {
  const subdirectory = await text({
    initialValue: DEFAULT_SCAFFOLD_DIRECTORY,
    message: "Subdirectory name",
    placeholder: DEFAULT_SCAFFOLD_DIRECTORY,
    validate: (value) => {
      if (!value?.trim()) {
        return "Subdirectory name is required.";
      }
    },
  });

  if (isCancel(subdirectory)) {
    return;
  }

  return subdirectory.trim();
};

const promptForProjectSlug = async (
  initialValue: string
): Promise<string | undefined> => {
  const projectSlug = await text({
    initialValue,
    message: "Project slug",
    placeholder: initialValue,
    validate: validateProjectSlug,
  });

  if (isCancel(projectSlug)) {
    return;
  }

  return projectSlug.trim();
};

const resolveRequestedDirectory = async (
  directory: string | undefined,
  shouldPrompt: boolean
): Promise<
  | {
      directory: string;
      skipNonEmptyConfirmation?: boolean;
    }
  | undefined
> => {
  let currentDirectoryEntries: string[] = [];

  if (!directory && shouldPrompt) {
    currentDirectoryEntries = await fs.readdir(process.cwd());
  }

  const initialResolution = resolveInitialDirectory({
    currentDirectoryEntries,
    directory,
    interactive: shouldPrompt,
  });

  if (initialResolution.kind === "target") {
    return { directory: initialResolution.directory };
  }

  const directoryAction = await promptForNoArgDirectoryAction();

  if (!directoryAction || directoryAction === CANCEL_SCAFFOLD) {
    return;
  }

  const subdirectory =
    directoryAction === CREATE_IN_SUBDIRECTORY
      ? await promptForSubdirectoryName()
      : undefined;
  const resolvedDirectory = resolveDirectoryFromAction(
    directoryAction,
    subdirectory
  );

  if (!resolvedDirectory) {
    return;
  }

  return {
    directory: resolvedDirectory,
    skipNonEmptyConfirmation: directoryAction === SCAFFOLD_CURRENT_DIRECTORY,
  };
};

const confirmScaffoldTarget = async (
  root: string,
  template: ScaffoldTemplate,
  shouldPrompt: boolean,
  options?: {
    skipNonEmptyConfirmation?: boolean;
  }
): Promise<boolean> => {
  const existingTarget = await fs.lstat(root).catch(() => null);

  if (existingTarget && !existingTarget.isDirectory()) {
    throw new Error(
      `Target path already exists and is not a directory: ${root}`
    );
  }

  if (!existingTarget?.isDirectory()) {
    return true;
  }

  const existingScaffoldPaths = await findExistingPaths(
    root,
    getScaffoldFiles(template).map((file) => file.path)
  );

  if (existingScaffoldPaths.length > 0) {
    throw new Error(
      `Target directory already contains scaffold files: ${existingScaffoldPaths.join(", ")}. Use a different directory or remove those files first.`
    );
  }

  const directoryEntries = await fs.readdir(root);
  const existingEntries = directoryEntries.toSorted((left, right) =>
    left.localeCompare(right)
  );

  if (existingEntries.length === 0) {
    return true;
  }

  if (options?.skipNonEmptyConfirmation) {
    return true;
  }

  if (!shouldPrompt) {
    throw new Error(
      `Target directory is not empty: ${root}. Choose an empty directory or run this command in an interactive terminal to confirm scaffolding there.`
    );
  }

  const shouldContinue = await confirm({
    message: `Scaffold into the non-empty directory ${root}? Existing files will be left untouched.`,
  });

  return !isCancel(shouldContinue) && shouldContinue;
};

const resolveProjectSlug = async (
  providedName: string | undefined,
  directory: string,
  shouldPrompt: boolean
): Promise<string | undefined> => {
  const defaultProjectSlug = deriveDefaultProjectSlug(directory, process.cwd());

  if (providedName) {
    return providedName;
  }

  if (!shouldPrompt) {
    return defaultProjectSlug;
  }

  return await promptForProjectSlug(defaultProjectSlug);
};

const writeScaffoldFiles = async (
  root: string,
  template: ScaffoldTemplate,
  projectSlug: string
) => {
  for (const file of getScaffoldFiles(template, { projectSlug })) {
    const filePath = path.join(root, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    if (file.type === "symlink") {
      await writeSymlinkIfMissing(filePath, file.target, {
        fallbackContent: file.fallbackContent,
      });
      continue;
    }

    await writeFileIfMissing(filePath, file.content);
  }
};

// --- Auth helpers ---

const fetchUserEmail = async (
  apiUrl: string,
  token: string
): Promise<string | null> => {
  try {
    const user = await requestJson<{ email: string }>(
      `${apiUrl}/auth/me`,
      { headers: { Authorization: `Bearer ${token}` } },
      "Failed to fetch user info"
    );
    return user.email;
  } catch {
    return null;
  }
};

// --- Push helpers ---

interface PushConfig {
  project: string;
  apiUrl: string;
  authToken: string;
  branch: string;
  commitMessage?: string;
}

const resolvePushConfig = async (
  config: { name?: string },
  options: {
    apiKey?: string;
    apiUrl?: string;
    branch?: string;
    message?: string;
    project?: string;
  }
): Promise<PushConfig> => {
  const project =
    options.project ?? process.env[BLODE_PROJECT_ENV] ?? config.name;
  const apiUrl =
    options.apiUrl ?? process.env[BLODE_API_URL_ENV] ?? DEFAULT_API_URL;

  const resolved = await resolveAuthToken(options.apiKey);
  const authToken = resolved?.token;

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
      'Missing project slug. Set "name" in docs.json, pass --project, or set BLODEMD_PROJECT.'
    );
  }
  if (!authToken) {
    throw new Error(
      'Missing credentials. Run "blodemd login", pass --api-key, or set BLODEMD_API_KEY.'
    );
  }

  return { apiUrl, authToken, branch, commitMessage, project };
};

const autoCreateProject = async (
  project: string,
  apiUrl: string,
  headers: Record<string, string>
): Promise<boolean> => {
  const authData = await readAuthFile();
  if (!authData?.session) {
    throw new Error(
      `Project "${project}" not found. Create it at blode.md or login with "blodemd login" to auto-create.`
    );
  }

  const shouldCreate = await confirm({
    message: `Project "${project}" doesn't exist. Create it?`,
  });

  if (isCancel(shouldCreate) || !shouldCreate) {
    return false;
  }

  const createResult = await requestJson<{
    project: { id: string; slug: string };
    token: string;
  }>(
    new URL("/projects", apiUrl).toString(),
    {
      body: JSON.stringify({ name: project, slug: project }),
      headers,
      method: "POST",
    },
    "Failed to create project"
  );

  log.success(`Project ${chalk.cyan(createResult.project.slug)} created`);
  log.info(`API key for CI: ${chalk.dim(createResult.token)}`);
  return true;
};

const scaffoldDocsSite = async (
  directory: string | undefined,
  options?: {
    deprecatedCommand?: string;
    name?: string;
    template?: ScaffoldTemplate;
    yes?: boolean;
  }
) => {
  intro(chalk.bold("blodemd new"));

  if (options?.deprecatedCommand) {
    log.warn(
      `"${options.deprecatedCommand}" is deprecated. Use ${chalk.cyan("blodemd new")} instead.`
    );
  }

  try {
    const template = options?.template ?? "minimal";
    const shouldPrompt = isInteractiveTerminal() && !options?.yes;
    const selectedDirectory = await resolveRequestedDirectory(
      directory,
      shouldPrompt
    );

    if (!selectedDirectory) {
      log.warn("Cancelled");
      return;
    }

    const resolvedDirectory = resolveScaffoldDirectory(
      selectedDirectory.directory
    );
    const root = path.resolve(process.cwd(), resolvedDirectory);

    if (
      !(await confirmScaffoldTarget(root, template, shouldPrompt, {
        skipNonEmptyConfirmation: selectedDirectory.skipNonEmptyConfirmation,
      }))
    ) {
      log.warn("Cancelled");
      return;
    }

    const projectSlug = await resolveProjectSlug(
      options?.name,
      resolvedDirectory,
      shouldPrompt
    );

    if (!projectSlug) {
      log.warn("Cancelled");
      return;
    }

    await fs.mkdir(root, { recursive: true });
    await writeScaffoldFiles(root, template, projectSlug);

    log.success(`Docs scaffolded in ${chalk.cyan(root)}`);
    if (template === "starter") {
      log.info("Starter template includes brand assets and helper files.");
    }
    log.info(`Project slug: ${chalk.cyan(projectSlug)}`);
    log.info("Done");
  } catch (error: unknown) {
    reportCommandError("New failed", error);
  }
};

// 4 MB limit keeps each batch well under Vercel's 4.5 MB serverless body cap
const MAX_BATCH_BYTES = 4 * 1024 * 1024;

const uploadFiles = async (
  files: string[],
  root: string,
  apiPath: (suffix: string) => string,
  deploymentId: string,
  headers: Record<string, string>,
  s: ReturnType<typeof spinner>
) => {
  s.start(`Uploading ${files.length} files`);

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
    s.message(`Uploading files (${uploaded}/${files.length})`);
  }

  s.stop(`Uploaded ${chalk.cyan(String(files.length))} files`);
};

// --- CLI ---

const program = new Command();
const cliVersion = readCliVersion(import.meta.url);

program.name("blodemd").description("Blode.md CLI").version(cliVersion);
program.hook("preAction", () => {
  assertSupportedNodeVersion();
});

// login

program
  .command("login")
  .description("Authenticate with Blode.md")
  .option("--token", "Paste an API key instead of using browser login")
  .option(
    "--port <port>",
    "Loopback callback port",
    String(DEFAULT_OAUTH_CALLBACK_PORT)
  )
  .option(
    "--timeout <seconds>",
    "OAuth timeout in seconds",
    String(DEFAULT_OAUTH_TIMEOUT_SECONDS)
  )
  .option("--no-open", "Print URL instead of opening the browser")
  .action(
    async (options: {
      token?: boolean;
      port: string;
      timeout: string;
      open: boolean;
    }) => {
      intro(chalk.bold("blodemd login"));

      try {
        if (options.token) {
          const apiKey = await password({
            message: "Enter your API key",
            validate: (value) => {
              if (!value) {
                return "API key is required.";
              }
            },
          });

          if (isCancel(apiKey)) {
            log.warn("Cancelled");
            return;
          }

          await writeStoredApiKey({ apiKey, type: "api-key" });

          const prefix = apiKey.split(".")[0] ?? apiKey.slice(0, 12);
          log.success(`Authenticated as ${chalk.cyan(prefix)}`);
          log.info("Done");
          return;
        }

        // OAuth 2.1 authorization code flow with PKCE
        const config = resolveSupabaseConfig();
        const { authorizeUrl, tokenUrl } = buildOAuthUrls(config);
        const clientId = OAUTH_CLIENT_ID;

        const port = parsePort(options.port);
        const timeoutSeconds = parsePositiveInteger(options.timeout, "Timeout");
        const redirectUrl = new URL(
          `http://127.0.0.1:${port}${DEFAULT_OAUTH_CALLBACK_PATH}`
        );

        const state = createOAuthState();
        const codeVerifier = createCodeVerifier();
        const codeChallenge = createCodeChallenge(codeVerifier);

        const authUrl = new URL(authorizeUrl);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUrl.toString());
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("scope", "openid email profile");

        const callbackPromise = waitForOAuthCode({
          expectedState: state,
          redirectUrl,
          timeoutMs: timeoutSeconds * 1000,
        });

        if (options.open) {
          log.info("Opening browser for authentication...");
          log.info(
            `If the browser doesn't open, visit: ${chalk.cyan(authUrl.toString())}`
          );
          await open(authUrl.toString());
        } else {
          log.info("Open this URL to continue authentication:");
          log.info(chalk.cyan(authUrl.toString()));
        }

        const code = await callbackPromise;

        const tokenResponse = await exchangeAuthorizationCode(
          { clientId, tokenUrl },
          code,
          codeVerifier,
          redirectUrl.toString()
        );

        const storedSession = tokenResponseToStoredSession(tokenResponse);
        await writeStoredAuthSession(storedSession);

        const email =
          storedSession.user?.email ??
          (await fetchUserEmail(
            process.env[BLODE_API_URL_ENV] ?? DEFAULT_API_URL,
            storedSession.accessToken
          ));

        if (email) {
          log.success(`Logged in as ${chalk.cyan(email)}`);
        } else {
          log.success("Logged in successfully.");
        }

        log.info("Done");
      } catch (error: unknown) {
        reportCommandError("Login failed", error);
      }
    }
  );

// logout

program
  .command("logout")
  .description("Remove stored credentials")
  .action(async () => {
    intro(chalk.bold("blodemd logout"));

    try {
      let existing = false;
      try {
        await fs.access(CREDENTIALS_FILE);
        existing = true;
      } catch {
        existing = false;
      }

      await clearStoredCredentials();

      if (existing) {
        log.success("Credentials removed.");
      } else {
        log.info("No stored credentials found.");
      }
      log.info("Done");
    } catch (error: unknown) {
      reportCommandError("Logout failed", error);
    }
  });

// whoami

program
  .command("whoami")
  .description("Show current authentication")
  .action(async () => {
    try {
      const resolved = await resolveAuthToken();

      if (!resolved) {
        log.warn('Not logged in. Run "blodemd login" to authenticate.');
        return;
      }

      if (resolved.source === "environment") {
        log.info("Authenticated via BLODEMD_API_KEY environment variable");
        return;
      }

      // API keys have no expiry and no user info from JWT
      if (!resolved.expiresAt && !resolved.user) {
        const prefix =
          resolved.token.split(".")[0] ?? resolved.token.slice(0, 12);
        log.info(`Logged in with API key ${chalk.cyan(prefix)}`);
        return;
      }

      const status = resolveTokenStatus(resolved);

      const email =
        resolved.user?.email ??
        (await fetchUserEmail(
          process.env[BLODE_API_URL_ENV] ?? DEFAULT_API_URL,
          resolved.token
        ));

      if (email) {
        log.info(`Logged in as ${chalk.cyan(email)}`);
      } else {
        log.info("Logged in (could not fetch user details).");
      }

      if (resolved.expiresAt && status.expired) {
        log.warn(
          'Session has expired. Run "blodemd login" to re-authenticate.'
        );
      }
    } catch (error: unknown) {
      reportCommandError("Whoami failed", error);
    }
  });

// new

program
  .command("new")
  .description("Create a new blode.md documentation site")
  .argument("[directory]", "target directory")
  .option("--name <slug>", "project slug for docs.json", parseProjectSlug)
  .option(
    "-t, --template <template>",
    `scaffold template (${SCAFFOLD_TEMPLATES.join(", ")})`,
    parseScaffoldTemplate,
    "minimal"
  )
  .option("-y, --yes", "accept defaults without prompting")
  .action(
    async (
      directory: string | undefined,
      options: {
        name?: string;
        template: ScaffoldTemplate;
        yes?: boolean;
      }
    ) => {
      await scaffoldDocsSite(directory, {
        name: options.name,
        template: options.template,
        yes: options.yes,
      });
    }
  );

program
  .command("init", { hidden: true })
  .argument("[directory]", "target directory")
  .option("--name <slug>", "project slug for docs.json", parseProjectSlug)
  .option(
    "-t, --template <template>",
    `scaffold template (${SCAFFOLD_TEMPLATES.join(", ")})`,
    parseScaffoldTemplate,
    "minimal"
  )
  .option("-y, --yes", "accept defaults without prompting")
  .action(
    async (
      directory: string | undefined,
      options: {
        name?: string;
        template: ScaffoldTemplate;
        yes?: boolean;
      }
    ) => {
      await scaffoldDocsSite(directory, {
        deprecatedCommand: "blodemd init",
        name: options.name,
        template: options.template,
        yes: options.yes,
      });
    }
  );

// validate

program
  .command("validate")
  .description("Validate docs.json")
  .argument("[dir]", "docs directory")
  .action(async (dir?: string) => {
    intro(chalk.bold("blodemd validate"));

    try {
      const root = await resolveDocsRoot(dir);
      const { warnings } = await loadValidatedSiteConfig(root);
      for (const warning of warnings) {
        log.warn(warning);
      }
      log.success(`${chalk.cyan(CONFIG_FILE)} is valid.`);
      log.info("Done");
    } catch (error: unknown) {
      reportCommandError("Validation failed", error);
    }
  });

// push

program
  .command("push")
  .description("Deploy docs")
  .argument("[dir]", "docs directory")
  .option("--project <slug>", "project slug (env: BLODEMD_PROJECT)")
  .option("--api-url <url>", "API URL (env: BLODEMD_API_URL)")
  .option("--api-key <token>", "API key (env: BLODEMD_API_KEY)")
  .option("--branch <name>", "git branch (env: BLODEMD_BRANCH)")
  .option("--message <msg>", "deploy message (env: BLODEMD_COMMIT_MESSAGE)")
  .action(
    async (
      dir: string | undefined,
      options: {
        apiKey?: string;
        apiUrl?: string;
        branch?: string;
        message?: string;
        project?: string;
      }
    ) => {
      intro(chalk.bold("blodemd push"));
      const s = spinner();

      try {
        const root = await resolveDocsRoot(dir);

        s.start("Validating configuration");
        const { config, warnings } = await loadValidatedSiteConfig(root);
        s.stop("Configuration valid");
        for (const warning of warnings) {
          log.warn(warning);
        }

        const { project, apiUrl, authToken, branch, commitMessage } =
          await resolvePushConfig(config, options);

        s.start("Collecting files");
        const files = await collectFiles(root);
        if (files.length === 0) {
          throw new Error("No files found to deploy.");
        }
        s.stop(`Found ${chalk.cyan(String(files.length))} files`);

        const headers = {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        };

        const apiPath = (suffix: string): string =>
          new URL(
            `/projects/slug/${project}/deployments${suffix}`,
            apiUrl
          ).toString();

        const createDeploymentBody = JSON.stringify({ branch, commitMessage });

        // Try creating the deployment — if 404, offer to create the project
        s.start("Creating deployment");
        let deployment: DeploymentResponse;
        try {
          deployment = await requestJson<DeploymentResponse>(
            apiPath(""),
            { body: createDeploymentBody, headers, method: "POST" },
            "Failed to create deployment"
          );
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "";
          if (!errorMessage.includes("404")) {
            throw error;
          }

          s.stop("Project not found");

          const created = await autoCreateProject(project, apiUrl, headers);
          if (!created) {
            log.info("Cancelled");
            return;
          }

          s.start("Creating deployment");
          deployment = await requestJson<DeploymentResponse>(
            apiPath(""),
            { body: createDeploymentBody, headers, method: "POST" },
            "Failed to create deployment"
          );
        }
        s.stop(`Deployment ${chalk.cyan(deployment.id)} created`);

        await uploadFiles(files, root, apiPath, deployment.id, headers, s);

        s.start("Finalizing deployment");
        const finalized = await requestJson<DeploymentResponse>(
          apiPath(`/${deployment.id}/finalize`),
          {
            body: JSON.stringify({ promote: true }),
            headers,
            method: "POST",
          },
          "Failed to finalize deployment"
        );
        s.stop("Deployment finalized");

        log.success(`Published ${chalk.cyan(finalized.id)}`);
        if (finalized.manifestUrl) {
          log.info(`Manifest: ${finalized.manifestUrl}`);
        }
        if (typeof finalized.fileCount === "number") {
          log.info(`Files: ${finalized.fileCount}`);
        }

        log.info("Done");
      } catch (error: unknown) {
        s.stop("Failed");
        reportCommandError("Push failed", error);
      }
    }
  );

// dev

program
  .command("dev")
  .description("Start the local docs dev server")
  .option("-p, --port <port>", "Port number", "3030")
  .option("-d, --dir <dir>", "Docs directory")
  .option("--no-open", "Don't open browser")
  .action(
    async (options: { dir?: string; open?: boolean; port: string }) =>
      await devCommand({
        dir: options.dir,
        openBrowser: options.open ?? true,
        port: options.port,
      })
  );

program.parse();
