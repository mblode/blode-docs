import { Buffer } from "node:buffer";

import {
  PublishDeploymentCreateSchema,
  PublishDeploymentFileSchema,
  PublishDeploymentFinalizeSchema,
} from "@repo/contracts";
import { Hono } from "hono";
import { z } from "zod";

import { deploymentDao, projectDao } from "../lib/db";
import { logError, logWarn } from "../lib/logger";
import { authorizeProjectRequest } from "../lib/project-auth";
import {
  finalizeDeploymentManifest,
  uploadDeploymentFile,
} from "../lib/publish";
import { badRequest, notFound, unauthorized } from "../lib/responses";
import { revalidateProject } from "../lib/revalidate";
import { validateJson, validateParams } from "../lib/validators";
import { mapDeployment } from "../mappers/records";

const projectIdParamsSchema = z.object({ projectId: z.string().uuid() });
const deploymentParamsSchema = projectIdParamsSchema.extend({
  deploymentId: z.string().uuid(),
});
const slugParamsSchema = z.object({ slug: z.string().min(1) });
const slugDeploymentParamsSchema = slugParamsSchema.extend({
  deploymentId: z.string().uuid(),
});

export const deployments = new Hono();

deployments.get(
  "/:projectId/deployments",
  validateParams(projectIdParamsSchema),
  async (c) => {
    const { projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const records = await deploymentDao.listByProject(projectId);
    return c.json(records.map(mapDeployment), 200);
  }
);

deployments.patch(
  "/:projectId/deployments/:deploymentId",
  validateParams(deploymentParamsSchema),
  async (c) => {
    const { deploymentId, projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const deployment = await deploymentDao.getByProjectId(
      projectId,
      deploymentId
    );
    if (!deployment) {
      return notFound(c);
    }
    const record = await deploymentDao.update(deployment.id, {
      promotedAt: new Date(),
      status: "successful",
    });
    return c.json(mapDeployment(record), 200);
  }
);

deployments.post(
  "/slug/:slug/deployments",
  validateParams(slugParamsSchema),
  validateJson(PublishDeploymentCreateSchema),
  async (c) => {
    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");
    const project = await projectDao.getBySlugUnique(slug);
    if (!project) {
      return notFound(c);
    }

    if (!(await authorizeProjectRequest(c, project.id))) {
      return unauthorized(c, "Invalid credentials.");
    }

    if (body.environment === "preview") {
      return badRequest(c, "Preview deployments are not supported.");
    }

    const record = await deploymentDao.create({
      branch: body.branch ?? "main",
      changes: body.changes ?? null,
      commitMessage: body.commitMessage ?? null,
      environment: "production",
      projectId: project.id,
      status: "building",
    });
    return c.json(mapDeployment(record), 201);
  }
);

deployments.post(
  "/slug/:slug/deployments/:deploymentId/files",
  validateParams(slugDeploymentParamsSchema),
  validateJson(PublishDeploymentFileSchema),
  async (c) => {
    const { deploymentId, slug } = c.req.valid("param");
    const body = c.req.valid("json");
    const project = await projectDao.getBySlugUnique(slug);
    if (!project) {
      return notFound(c);
    }

    if (!(await authorizeProjectRequest(c, project.id))) {
      return unauthorized(c, "Invalid credentials.");
    }

    const deployment = await deploymentDao.getByProjectId(
      project.id,
      deploymentId
    );
    if (!deployment) {
      return notFound(c);
    }

    if (!["building", "queued"].includes(deployment.status)) {
      return badRequest(c, "Deployment is not accepting files.");
    }

    try {
      const content = Buffer.from(body.contentBase64, "base64");
      const record = await uploadDeploymentFile({
        content,
        contentType: body.contentType,
        deploymentId: deployment.id,
        projectSlug: project.slug,
        relativePath: body.path,
      });
      return c.json(record, 200);
    } catch (error) {
      logError("Failed to upload deployment file", error);
      return badRequest(
        c,
        error instanceof Error ? error.message : "Unable to upload file."
      );
    }
  }
);

deployments.post(
  "/slug/:slug/deployments/:deploymentId/finalize",
  validateParams(slugDeploymentParamsSchema),
  validateJson(PublishDeploymentFinalizeSchema),
  async (c) => {
    const { deploymentId, slug } = c.req.valid("param");
    const body = c.req.valid("json");
    const project = await projectDao.getBySlugUnique(slug);
    if (!project) {
      return notFound(c);
    }

    if (!(await authorizeProjectRequest(c, project.id))) {
      return unauthorized(c, "Invalid credentials.");
    }

    const deployment = await deploymentDao.getByProjectId(
      project.id,
      deploymentId
    );
    if (!deployment) {
      return notFound(c);
    }

    try {
      const manifest = await finalizeDeploymentManifest({
        deploymentId: deployment.id,
        projectSlug: project.slug,
      });
      const shouldPromote = body.promote !== false;
      const updated = await deploymentDao.update(deployment.id, {
        fileCount: manifest.fileCount,
        manifestUrl: manifest.manifestUrl,
        promotedAt: shouldPromote ? new Date() : null,
        status: "successful",
      });

      if (shouldPromote) {
        try {
          await revalidateProject(project.slug);
        } catch (error) {
          logWarn("Failed to revalidate docs project", error);
        }
      }

      return c.json(mapDeployment(updated), 200);
    } catch (error) {
      await deploymentDao.update(deployment.id, { status: "failed" });
      logError("Failed to finalize deployment", error);
      return badRequest(
        c,
        error instanceof Error
          ? error.message
          : "Unable to finalize deployment."
      );
    }
  }
);
