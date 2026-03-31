import { ProjectUpdateSchema } from "@repo/contracts";
import { Hono } from "hono";
import { z } from "zod";

import { projectDao } from "../lib/db";
import { isUniqueViolationError } from "../lib/db-errors";
import { syncProjectTenantEdgeConfig } from "../lib/edge-config";
import { logWarn } from "../lib/logger";
import {
  authorizeProjectRequest,
  getAuthenticatedUser,
} from "../lib/project-auth";
import { createProjectWithDefaultApiKey } from "../lib/project-service";
import { badRequest, notFound, unauthorized } from "../lib/responses";
import { validateJson, validateParams } from "../lib/validators";
import { mapApiKey, mapProject } from "../mappers/records";

const projectIdParamsSchema = z.object({ projectId: z.string().uuid() });

const projectCreateSchema = z.object({
  description: z.string().optional(),
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
});

export const projects = new Hono();

// List projects for the authenticated user
projects.get("/", async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return unauthorized(c, "Authentication required.");
  }

  const records = await projectDao.listByUser(user.id);
  return c.json(records.map(mapProject), 200);
});

// Create a new project
projects.post("/", validateJson(projectCreateSchema), async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return unauthorized(c, "Authentication required.");
  }

  const body = c.req.valid("json");

  const existing = await projectDao.getBySlugUnique(body.slug);
  if (existing) {
    return badRequest(c, `Project slug "${body.slug}" is already taken.`);
  }

  let created: Awaited<ReturnType<typeof createProjectWithDefaultApiKey>>;
  try {
    created = await createProjectWithDefaultApiKey({
      description: body.description,
      name: body.name,
      slug: body.slug,
      userId: user.id,
    });
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return badRequest(c, `Project slug "${body.slug}" is already taken.`);
    }
    throw error;
  }

  try {
    await syncProjectTenantEdgeConfig(created.project.id);
  } catch (error: unknown) {
    logWarn("Failed to sync tenant Edge Config after project create", error);
  }

  return c.json(
    {
      apiKey: mapApiKey(created.apiKey),
      project: mapProject(created.project),
      token: created.token,
    },
    201
  );
});

// Get a project by ID
projects.get(
  "/:projectId",
  validateParams(projectIdParamsSchema),
  async (c) => {
    const { projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const record = await projectDao.getById(projectId);
    if (!record) {
      return notFound(c);
    }
    return c.json(mapProject(record), 200);
  }
);

// Update a project
projects.patch(
  "/:projectId",
  validateParams(projectIdParamsSchema),
  validateJson(ProjectUpdateSchema),
  async (c) => {
    const { projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const body = c.req.valid("json");
    const existing = await projectDao.getById(projectId);
    if (!existing) {
      return notFound(c);
    }
    const record = await projectDao.update(projectId, body);

    try {
      await syncProjectTenantEdgeConfig(projectId);
    } catch (error: unknown) {
      logWarn("Failed to sync tenant Edge Config after project update", error);
    }

    return c.json(mapProject(record), 200);
  }
);
