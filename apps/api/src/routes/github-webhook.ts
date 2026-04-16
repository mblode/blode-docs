import { Hono } from "hono";

import { deploymentDao, gitConnectionDao } from "../lib/db";
import { syncProjectTenantEdgeConfig } from "../lib/edge-config";
import { verifyWebhookSignature } from "../lib/github";
import { logError, logWarn } from "../lib/logger";
import { unauthorized } from "../lib/responses";

interface PushPayload {
  ref?: string;
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

export const githubWebhook = new Hono();

githubWebhook.post("/", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature ?? null)) {
    return unauthorized(c, "Invalid signature.");
  }

  const event = c.req.header("x-github-event");
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

  const results = await Promise.allSettled(
    matches.map(async (connection) => {
      const deployment = await deploymentDao.create({
        branch,
        commitMessage: payload.head_commit?.message ?? null,
        environment: "production",
        projectId: connection.projectId,
        status: "queued",
      });
      // Webhook only enqueues — push of file contents happens via the
      // existing /deployments/:id/files/batch + finalize endpoints, which
      // the GitHub-side runner (or future background job) will call.
      try {
        await syncProjectTenantEdgeConfig(connection.projectId);
      } catch (error) {
        logWarn("Failed to sync tenant Edge Config after webhook", error);
      }
      return deployment.id;
    })
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    for (const result of failed) {
      logError("Webhook deployment enqueue failed", result.reason);
    }
  }

  return c.json(
    {
      enqueued: results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<string>).value),
      ok: true,
    },
    202
  );
});
