import fs from "node:fs/promises";

import { intro } from "@clack/prompts";
import chalk from "chalk";
import type { Command } from "commander";
import open from "open";

import {
  resolveApiKeyCredential,
  resolveAuthToken,
  resolveTokenStatus,
} from "../auth-session.js";
import { reportCommandError } from "../command-utils.js";
import {
  BLODE_API_KEY_ENV,
  BLODE_API_URL_ENV,
  CREDENTIALS_FILE,
  DEFAULT_API_URL,
  DEFAULT_OAUTH_CALLBACK_PATH,
  DEFAULT_OAUTH_CALLBACK_PORT,
  DEFAULT_OAUTH_TIMEOUT_SECONDS,
  OAUTH_CLIENT_ID,
} from "../constants.js";
import { EXIT_CODES } from "../errors.js";
import { requestJson } from "../http.js";
import { waitForOAuthCode } from "../oauth-callback.js";
import { exchangeAuthorizationCode } from "../oauth-token.js";
import { createReporter } from "../output.js";
import {
  createCodeChallenge,
  createCodeVerifier,
  createOAuthState,
} from "../pkce.js";
import { clearStoredCredentials, writeStoredAuthSession } from "../storage.js";
import {
  buildOAuthUrls,
  resolveSupabaseConfig,
  tokenResponseToStoredSession,
} from "../supabase.js";
import { parsePort, parsePositiveInteger } from "../validation.js";

/** Which credential `blodemd push` would actually authenticate with. */
export type CredentialSource = "api-key" | "session";

/**
 * The precedence `push` applies (see `resolveAuthHeaders` in push.ts): the
 * `--api-key` flag, then `BLODEMD_API_KEY`, then the stored login session.
 * Every command that reports or uses credentials must agree with it, otherwise
 * `whoami` describes a session that `push` never touches.
 */

/** Exactly what `whoami --json` prints, so callers can depend on the shape. */
export interface WhoamiPayload {
  email: string | null;
  expiresAt: string | null;
  loggedIn: boolean;
  source: CredentialSource;
}

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

export const registerAuthCommands = (program: Command): void => {
  program
    .command("login")
    .description("Authenticate with Blode.md via GitHub in your browser")
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
      async (options: { port: string; timeout: string; open: boolean }) => {
        const reporter = createReporter();
        if (reporter.interactive) {
          intro(chalk.bold("blodemd login"));
        }

        try {
          // OAuth 2.1 authorization code flow with PKCE (GitHub via Supabase)
          const config = resolveSupabaseConfig();
          const { authorizeUrl, tokenUrl } = buildOAuthUrls(config);
          const clientId = OAUTH_CLIENT_ID;

          const port = parsePort(options.port);
          const timeoutSeconds = parsePositiveInteger(
            options.timeout,
            "Timeout"
          );
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
          // Pin provider=github so users go straight to GitHub OAuth without a picker
          authUrl.searchParams.set("provider", "github");

          const callbackPromise = waitForOAuthCode({
            expectedState: state,
            redirectUrl,
            timeoutMs: timeoutSeconds * 1000,
          });

          if (options.open) {
            reporter.info("Opening browser for authentication...");
            reporter.info(
              `If the browser doesn't open, visit: ${chalk.cyan(authUrl.toString())}`
            );
            await open(authUrl.toString());
          } else {
            reporter.info("Open this URL to continue authentication:");
            reporter.info(chalk.cyan(authUrl.toString()));
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
            reporter.success(`Logged in as ${chalk.cyan(email)}`);
          } else {
            reporter.success("Logged in successfully.");
          }

          if (resolveApiKeyCredential()) {
            reporter.warn(
              `${BLODE_API_KEY_ENV} is set, so "blodemd push" will keep using that API key instead of this session.`
            );
          }

          reporter.info("Done");
        } catch (error: unknown) {
          reportCommandError("Login failed", error);
        }
      }
    );

  program
    .command("logout")
    .description("Remove stored credentials")
    .action(async () => {
      const reporter = createReporter();
      if (reporter.interactive) {
        intro(chalk.bold("blodemd logout"));
      }

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
          reporter.success("Credentials removed.");
        } else {
          reporter.info("No stored credentials found.");
        }
        reporter.info("Done");
      } catch (error: unknown) {
        reportCommandError("Logout failed", error);
      }
    });

  program
    .command("whoami")
    .description("Show the credential blodemd would authenticate with")
    .option("--api-key <token>", "API key (env: BLODEMD_API_KEY)")
    .option("--json", "output machine-readable JSON (implies non-interactive)")
    .action(async (options: { apiKey?: string; json?: boolean }) => {
      const reporter = createReporter({ json: options.json });

      try {
        // Report the credential `push` would pick, not whichever one happens to
        // be stored on disk.
        if (resolveApiKeyCredential(options.apiKey)) {
          const origin = options.apiKey ? "--api-key" : BLODE_API_KEY_ENV;
          reporter.info(
            `Using the API key from ${origin}. A project-scoped key carries no user identity, and any stored session is ignored.`
          );
          reporter.json({
            email: null,
            expiresAt: null,
            loggedIn: true,
            source: "api-key",
          } satisfies WhoamiPayload);
          return;
        }

        const resolved = await resolveAuthToken();

        if (!resolved) {
          reporter.warn('Not logged in. Run "blodemd login" to authenticate.');
          reporter.json({
            email: null,
            expiresAt: null,
            loggedIn: false,
            source: "session",
          } satisfies WhoamiPayload);
          process.exitCode = EXIT_CODES.AUTH_REQUIRED;
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
          reporter.info(`Logged in as ${chalk.cyan(email)}`);
        } else {
          reporter.info("Logged in (could not fetch user details).");
        }

        if (resolved.expiresAt && status.expired) {
          reporter.warn(
            'Session has expired. Run "blodemd login" to re-authenticate.'
          );
        }

        reporter.json({
          email,
          expiresAt: resolved.expiresAt,
          loggedIn: true,
          source: "session",
        } satisfies WhoamiPayload);
      } catch (error: unknown) {
        reportCommandError("Whoami failed", error, { json: options.json });
      }
    });
};
