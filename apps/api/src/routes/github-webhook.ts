import { Hono } from "hono";

import {
  deploymentDao,
  githubInstallationDao,
  gitConnectionDao,
  projectDao,
} from "../lib/db";
import { syncProjectTenantEdgeConfig } from "../lib/edge-config";
import { fetchDocsFiles, verifyWebhookSignature } from "../lib/github";
import { logError, logWarn } from "../lib/logger";
import { prewarmProject } from "../lib/prewarm";
import {
  finalizeDeploymentManifest,
  isPublishValidationError,
  uploadDeploymentFiles,
} from "../lib/publish";
import { unauthorized } from "../lib/responses";
import { revalidateProject } from "../lib/revalidate";

interface PushPayload {
  ref?: string;
  after?: string;
  installation?: { id?: number };
  repository?: { full_name?: string };
  head_commit?: { id?: string; message?: string };
  pusher?: { name?: string };
}

const safeParse = (raw: string): PushPayload | null => {
  try {
    return JSON.parse(raw) as PushPayload;
  } catch {
    return null;
  }
};

const branchFromRef = (ref?: string): string | null => {
  if (!ref || !ref.startsWith("refs/heads/")) {
    return null;
  }
  return ref.slice("refs/heads/".length);
};

interface RunInput {
  branch: string;
  commitMessage: string | null;
  commitSha: string;
  connection: Awaited<
    ReturnType<typeof gitConnectionDao.listByInstallation>
  >[number];
}

const runDeployment = async (input: RunInput): Promise<string | null> => {
  const project = await projectDao.getById(input.connection.projectId);
  if (!project) {
    logWarn(
      `Webhook: project ${input.connection.projectId} missing for connection ${input.connection.id}`,
      null
    );
    return null;
  }

  const deployment = await deploymentDao.create({
    branch: input.branch,
    commitMessage: input.commitMessage,
    environment: "production",
    projectId: project.id,
    status: "building",
  });

  try {
    const { files } = await fetchDocsFiles({
      docsPath: input.connection.docsPath,
      installationId: input.connection.installationId,
      ref: input.commitSha,
      repository: input.connection.repository,
    });

    await uploadDeploymentFiles(
      project.slug,
      deployment.id,
      files.map((file) => ({
        content: file.content,
        relativePath: file.relativePath,
      }))
    );

    const manifest = await finalizeDeploymentManifest({
      deploymentId: deployment.id,
      projectSlug: project.slug,
    });

    await deploymentDao.update(deployment.id, {
      fileCount: manifest.fileCount,
      manifestUrl: manifest.manifestUrl,
      promotedAt: new Date(),
      status: "successful",
    });

    try {
      await syncProjectTenantEdgeConfig(project.id);
    } catch (error) {
      logWarn("Webhook: edge config sync failed", error);
    }
    try {
      await revalidateProject(project.slug);
    } catch (error) {
      logWarn("Webhook: revalidate failed", error);
    }
    try {
      await prewarmProject(project.id);
    } catch (error) {
      logWarn("Webhook: prewarm failed", error);
    }

    return deployment.id;
  } catch (error) {
    await deploymentDao
      .update(deployment.id, { status: "failed" })
      .catch(() => null);
    if (isPublishValidationError(error)) {
      logError(`Webhook deployment ${deployment.id} validation failed`, error);
    } else {
      logError(`Webhook deployment ${deployment.id} failed`, error);
    }
    return deployment.id;
  }
};

export const githubWebhook = new Hono();

githubWebhook.post("/", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature ?? null)) {
    return unauthorized(c, "Invalid signature.");
  }

  const event = c.req.header("x-github-event");
  if (event === "ping") {
    return c.json({ ok: true, pong: true }, 200);
  }
  if (event === "installation") {
    const payload = safeParse(rawBody) as
      | (PushPayload & { action?: string })
      | null;
    if (
      payload?.action === "deleted" &&
      typeof payload.installation?.id === "number"
    ) {
      await githubInstallationDao
        .deleteByInstallationId(payload.installation.id)
        .catch((error: unknown) => {
          logError("Failed to delete github installation rows", error);
        });
    }
    return c.json({ ok: true }, 200);
  }
  if (event !== "push") {
    return c.json({ ignored: event, ok: true }, 200);
  }

  const payload = safeParse(rawBody);
  if (!payload?.installation?.id || !payload.repository?.full_name) {
    return c.json({ ignored: "incomplete payload", ok: true }, 200);
  }

  const branch = branchFromRef(payload.ref);
  if (!branch) {
    return c.json({ ignored: "non-branch ref", ok: true }, 200);
  }

  const commitSha = payload.after ?? payload.head_commit?.id;
  if (!commitSha) {
    return c.json({ ignored: "missing commit sha", ok: true }, 200);
  }

  const installationId = payload.installation.id;
  const repository = payload.repository.full_name;

  const allConnections =
    await gitConnectionDao.listByInstallation(installationId);
  const matches = allConnections.filter(
    (connection) =>
      connection.repository === repository && connection.branch === branch
  );

  if (matches.length === 0) {
    return c.json({ ignored: "no matching connection", ok: true }, 200);
  }

  const deploymentIds = await Promise.all(
    matches.map((connection) =>
      runDeployment({
        branch,
        commitMessage: payload.head_commit?.message ?? null,
        commitSha,
        connection,
      })
    )
  );

  return c.json(
    {
      deployments: deploymentIds.filter((id): id is string => id !== null),
      ok: true,
    },
    202
  );
});
