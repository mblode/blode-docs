import { ProjectUpdateSchema } from "@repo/contracts";
import { Hono } from "hono";
import { z } from "zod";

import { createApiKeyToken } from "../lib/api-key-auth";
import { apiKeyDao, projectDao } from "../lib/db";
import {
  authorizeProjectRequest,
  getAuthenticatedUser,
} from "../lib/project-auth";
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

  const record = await projectDao.create({
    deploymentName: body.slug,
    description: body.description,
    name: body.name,
    slug: body.slug,
    userId: user.id,
  });

  const { prefix, token, tokenHash } = createApiKeyToken();
  const apiKey = await apiKeyDao.create({
    name: "Default",
    prefix,
    projectId: record.id,
    tokenHash,
    userId: user.id,
  });

  return c.json(
    {
      apiKey: mapApiKey(apiKey),
      project: mapProject(record),
      token,
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
    return c.json(mapProject(record), 200);
  }
);
