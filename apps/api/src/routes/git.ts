import { GitConnectionBindSchema } from "@repo/contracts";
import { Hono } from "hono";
import { decodeJwt } from "jose";
import { z } from "zod";

import { gitConnectionDao, projectDao } from "../lib/db";
import {
  exchangeUserCode,
  getInstallationAccount,
  installAppUrl,
  isGithubAppConfigured,
  listAppInstallations,
  listInstallationRepos,
  listUserInstallations,
  signInstallState,
  verifyInstallState,
} from "../lib/github";
import { getBearerToken } from "../lib/header-auth";
import { logError } from "../lib/logger";
import {
  authorizeProjectRequest,
  getAuthenticatedUser,
} from "../lib/project-auth";
import {
  badRequest,
  internalServerError,
  noContent,
  notFound,
  unauthorized,
} from "../lib/responses";
import { validateJson, validateParams } from "../lib/validators";
import { mapGitConnection } from "../mappers/records";

const projectIdParamsSchema = z.object({ projectId: z.string().uuid() });
const installationParamsSchema = z.object({
  installationId: z.string().regex(/^\d+$/).transform(Number),
});

// Project-scoped GitHub connection routes; mount under /projects.
export const projectGit = new Hono();

projectGit.get(
  "/:projectId/git",
  validateParams(projectIdParamsSchema),
  async (c) => {
    const { projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const record = await gitConnectionDao.getByProject(projectId);
    return c.json(record ? mapGitConnection(record) : null, 200);
  }
);

projectGit.post(
  "/:projectId/git/install-url",
  validateParams(projectIdParamsSchema),
  async (c) => {
    const { projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    if (!isGithubAppConfigured()) {
      return badRequest(c, "GitHub App is not configured on this server.");
    }
    const state = signInstallState(projectId);
    if (!state) {
      return internalServerError(c);
    }
    const url = installAppUrl(state);
    if (!url) {
      return internalServerError(c);
    }
    return c.json({ state, url }, 200);
  }
);

projectGit.post(
  "/:projectId/git",
  validateParams(projectIdParamsSchema),
  validateJson(GitConnectionBindSchema),
  async (c) => {
    const { projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const body = c.req.valid("json");

    const account = await getInstallationAccount(body.installationId).catch(
      (error: unknown) => {
        logError("Failed to fetch installation account", error);
        return null;
      }
    );
    if (!account) {
      return badRequest(c, "Installation not found or app misconfigured.");
    }

    const repos = await listInstallationRepos(body.installationId).catch(
      (error: unknown) => {
        logError("Failed to list installation repos", error);
        return null;
      }
    );
    if (!repos?.some((repo) => repo.fullName === body.repository)) {
      return badRequest(
        c,
        `Repository "${body.repository}" is not accessible from this installation.`
      );
    }

    const record = await gitConnectionDao.upsert({
      accountLogin: account.login,
      branch: body.branch,
      docsPath: body.docsPath,
      installationId: body.installationId,
      projectId,
      repository: body.repository,
    });
    return c.json(mapGitConnection(record), 201);
  }
);

projectGit.delete(
  "/:projectId/git",
  validateParams(projectIdParamsSchema),
  async (c) => {
    const { projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const existing = await gitConnectionDao.getByProject(projectId);
    if (!existing) {
      return notFound(c);
    }
    await gitConnectionDao.delete(existing.id);
    return noContent();
  }
);

// Global GitHub install routes; mount under /git.
export const githubInstall = new Hono();

githubInstall.get(
  "/installations/:installationId/repos",
  validateParams(installationParamsSchema),
  async (c) => {
    const { installationId } = c.req.valid("param");
    if (!(await getAuthenticatedUser(c))) {
      return unauthorized(c, "Authentication required.");
    }
    if (!isGithubAppConfigured()) {
      return badRequest(c, "GitHub App is not configured on this server.");
    }
    const repos = await listInstallationRepos(installationId).catch(
      (error: unknown) => {
        logError("Failed to list installation repos", error);
        return null;
      }
    );
    if (!repos) {
      return badRequest(c, "Unable to read installation repositories.");
    }
    return c.json({ repos }, 200);
  }
);

const extractGithubLogin = (
  headers: Record<string, unknown>
): string | null => {
  const token = getBearerToken(headers);
  if (!token) {
    return null;
  }
  try {
    const claims = decodeJwt(token) as {
      user_metadata?: {
        user_name?: unknown;
        preferred_username?: unknown;
      };
    };
    const metadata = claims.user_metadata;
    const login =
      (typeof metadata?.user_name === "string" && metadata.user_name) ||
      (typeof metadata?.preferred_username === "string" &&
        metadata.preferred_username) ||
      null;
    return login ? login.toLowerCase() : null;
  } catch {
    return null;
  }
};

githubInstall.get("/installations/mine", async (c) => {
  if (!(await getAuthenticatedUser(c))) {
    return unauthorized(c, "Authentication required.");
  }
  if (!isGithubAppConfigured()) {
    return c.json({ installations: [] }, 200);
  }
  const login = extractGithubLogin(
    Object.fromEntries(c.req.raw.headers.entries())
  );
  if (!login) {
    return c.json({ installations: [] }, 200);
  }
  const installations = await listAppInstallations().catch((error: unknown) => {
    logError("Failed to list app installations", error);
    return null;
  });
  if (!installations) {
    return c.json({ installations: [] }, 200);
  }
  const matches = installations.filter(
    (installation) => installation.accountLogin.toLowerCase() === login
  );
  return c.json({ installations: matches }, 200);
});

const codeBodySchema = z.object({ code: z.string().min(1) });

githubInstall.post(
  "/installations/from-code",
  validateJson(codeBodySchema),
  async (c) => {
    if (!(await getAuthenticatedUser(c))) {
      return unauthorized(c, "Authentication required.");
    }
    if (!isGithubAppConfigured()) {
      return badRequest(c, "GitHub App is not configured on this server.");
    }
    const { code } = c.req.valid("json");
    const token = await exchangeUserCode(code).catch((error: unknown) => {
      logError("Failed to exchange GitHub user code", error);
      return null;
    });
    if (!token) {
      return badRequest(c, "Could not exchange GitHub code.");
    }
    const installations = await listUserInstallations(token).catch(
      (error: unknown) => {
        logError("Failed to list user installations", error);
        return null;
      }
    );
    if (!installations) {
      return badRequest(c, "Could not read user installations from GitHub.");
    }
    return c.json({ installations }, 200);
  }
);

githubInstall.get("/state/:state", async (c) => {
  if (!(await getAuthenticatedUser(c))) {
    return unauthorized(c, "Authentication required.");
  }
  const state = c.req.param("state");
  const verified = verifyInstallState(state);
  if (!verified) {
    return badRequest(c, "Install state is invalid or expired.");
  }
  const project = await projectDao.getById(verified.projectId);
  if (!project) {
    return badRequest(c, "Project not found.");
  }
  return c.json({ projectId: project.id, projectSlug: project.slug }, 200);
});
