import { GitConnectionBindSchema } from "@repo/contracts";
import { Hono } from "hono";
import { z } from "zod";

import { gitConnectionDao } from "../lib/db";
import {
  getInstallationAccount,
  installAppUrl,
  isGithubAppConfigured,
  listInstallationRepos,
  signInstallState,
  verifyInstallState,
} from "../lib/github";
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
    if (
      !(await authorizeProjectRequest(c, projectId, {
        allowProjectApiKey: false,
      }))
    ) {
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
    if (
      !(await authorizeProjectRequest(c, projectId, {
        allowProjectApiKey: false,
      }))
    ) {
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

githubInstall.get("/state/:state", async (c) => {
  if (!(await getAuthenticatedUser(c))) {
    return unauthorized(c, "Authentication required.");
  }
  const state = c.req.param("state");
  const verified = verifyInstallState(state);
  if (!verified) {
    return badRequest(c, "Install state is invalid or expired.");
  }
  return c.json(verified, 200);
});
