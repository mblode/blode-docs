import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import {
  confirm,
  intro,
  isCancel,
  log,
  password,
  spinner,
} from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import open from "open";

import { resolveAuthToken, resolveTokenStatus } from "./auth-session.js";
import {
  BLODE_API_URL_ENV,
  BLODE_BRANCH_ENV,
  BLODE_COMMIT_MESSAGE_ENV,
  BLODE_PROJECT_ENV,
  DEFAULT_API_URL,
  DEFAULT_OAUTH_CALLBACK_PATH,
  DEFAULT_OAUTH_CALLBACK_PORT,
  DEFAULT_OAUTH_TIMEOUT_SECONDS,
  OAUTH_CLIENT_ID,
} from "./constants.js";
import { CliError, EXIT_CODES, toCliError } from "./errors.js";
import { waitForOAuthCode } from "./oauth-callback.js";
import { exchangeAuthorizationCode } from "./oauth-token.js";
import {
  createCodeChallenge,
  createCodeVerifier,
  createOAuthState,
} from "./pkce.js";
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

const CONFIG_FILE = "docs.json";

const TEXT_CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mdx": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".yaml": "application/yaml; charset=utf-8",
  ".yml": "application/yaml; charset=utf-8",
};

// --- File helpers ---

const ensureFile = async (filePath: string, content: string): Promise<void> => {
  try {
    await fs.writeFile(filePath, content, { flag: "wx" });
  } catch {
    // File already exists
  }
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const readConfig = async (
  root: string
): Promise<{ name?: string; raw: string }> => {
  const raw = await fs.readFile(path.join(root, CONFIG_FILE), "utf8");
  const parsed = JSON.parse(raw) as { name?: string };
  return { name: parsed.name, raw };
};

const resolveDocsRoot = async (dir?: string): Promise<string> => {
  if (dir) {
    return path.resolve(process.cwd(), dir);
  }

  const candidates = [
    process.cwd(),
    path.join(process.cwd(), "docs"),
    path.join(process.cwd(), "apps/docs"),
  ];

  for (const candidate of candidates) {
    if (await fileExists(path.join(candidate, CONFIG_FILE))) {
      return candidate;
    }
  }

  return process.cwd();
};

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

const normalizeRelativePath = (root: string, filePath: string): string =>
  path.relative(root, filePath).split(path.sep).join("/");

const shouldSkipEntry = (name: string): boolean =>
  name.startsWith(".") || name === "node_modules";

const collectFiles = async (root: string): Promise<string[]> => {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (shouldSkipEntry(entry.name)) {
      continue;
    }

    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files.toSorted((left, right) => left.localeCompare(right));
};

const getContentType = (filePath: string): string =>
  TEXT_CONTENT_TYPES[path.extname(filePath).toLowerCase()] ??
  "application/octet-stream";

const readJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
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

const parsePositiveInteger = (value: string, label: string): number => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CliError(
      `${label} must be a positive integer.`,
      EXIT_CODES.VALIDATION
    );
  }

  return parsed;
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

const uploadFiles = async (
  files: string[],
  root: string,
  apiPath: (suffix: string) => string,
  deploymentId: string,
  headers: Record<string, string>,
  s: ReturnType<typeof spinner>
) => {
  s.start(`Uploading ${files.length} files`);
  for (const [index, filePath] of files.entries()) {
    const relativePath = normalizeRelativePath(root, filePath);
    const content = await fs.readFile(filePath);

    await requestJson(
      apiPath(`/${deploymentId}/files`),
      {
        body: JSON.stringify({
          contentBase64: content.toString("base64"),
          contentType: getContentType(filePath),
          path: relativePath,
        }),
        headers,
        method: "POST",
      },
      `Failed to upload ${relativePath}`
    );

    s.message(`Uploading files (${index + 1}/${files.length})`);
  }
  s.stop(`Uploaded ${chalk.cyan(String(files.length))} files`);
};

// --- CLI ---

const program = new Command();

program.name("blodemd").description("Blode.md CLI").version("0.0.3");

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

        const port = parsePositiveInteger(options.port, "Port");
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
      const existing = await readAuthFile();
      await clearStoredCredentials();

      if (existing?.session || existing?.apiKey) {
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

// init

program
  .command("init")
  .description("Scaffold a docs folder")
  .argument("[dir]", "target directory", "docs")
  .action(async (dir: string) => {
    intro(chalk.bold("blodemd init"));

    try {
      const root = path.resolve(process.cwd(), dir);
      await fs.mkdir(root, { recursive: true });

      const docsJson = {
        $schema: "https://mintlify.com/docs.json",
        colors: { primary: "#0D9373" },
        name: "my-project",
        navigation: {
          groups: [{ group: "Getting Started", pages: ["index"] }],
        },
        theme: "mint",
      };

      await ensureFile(
        path.join(root, CONFIG_FILE),
        `${JSON.stringify(docsJson, null, 2)}\n`
      );
      await ensureFile(
        path.join(root, "index.mdx"),
        "---\ntitle: Welcome\n---\n\nStart writing your docs here.\n"
      );

      log.success(`Docs scaffolded in ${chalk.cyan(root)}`);
      log.info(`Set ${chalk.cyan("name")} in docs.json to your project slug.`);
      log.info("Done");
    } catch (error: unknown) {
      reportCommandError("Init failed", error);
    }
  });

// validate

program
  .command("validate")
  .description("Validate docs.json")
  .argument("[dir]", "docs directory")
  .action(async (dir?: string) => {
    intro(chalk.bold("blodemd validate"));

    try {
      const root = await resolveDocsRoot(dir);
      await readConfig(root);
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
        const config = await readConfig(root);
        s.stop("Configuration valid");

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
  .description("Start the docs dev server")
  .action(() => {
    intro(chalk.bold("blodemd dev"));
    log.info(
      `Run ${chalk.cyan("npx turbo dev --filter=docs")} from the repo root.`
    );
    log.info(
      `Then open ${chalk.cyan("http://localhost:3001")} to view the docs site.`
    );
    log.info("Done");
  });

program.parse();
