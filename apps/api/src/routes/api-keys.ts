import { ApiKeyCreateSchema } from "@repo/contracts";
import { Hono } from "hono";
import { z } from "zod";

import { createApiKeyToken } from "../lib/api-key-auth.js";
import { apiKeyDao } from "../lib/db.js";
import { authorizeProjectRequest } from "../lib/project-auth.js";
import { unauthorized } from "../lib/responses.js";
import { validateJson, validateParams } from "../lib/validators.js";
import { mapApiKey } from "../mappers/records.js";

const projectIdParamsSchema = z.object({ projectId: z.string().uuid() });
const apiKeyCreateBodySchema = ApiKeyCreateSchema.omit({ projectId: true });

export const apiKeys = new Hono();

apiKeys.get(
  "/:projectId/api-keys",
  validateParams(projectIdParamsSchema),
  async (c) => {
    const { projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const records = await apiKeyDao.listByProject(projectId);
    return c.json(records.map(mapApiKey), 200);
  }
);

apiKeys.post(
  "/:projectId/api-keys",
  validateParams(projectIdParamsSchema),
  validateJson(apiKeyCreateBodySchema),
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
    const { prefix, token, tokenHash } = createApiKeyToken();
    const record = await apiKeyDao.create({
      name: body.name,
      prefix,
      projectId,
      tokenHash,
    });
    return c.json(
      {
        apiKey: mapApiKey(record),
        token,
      },
      201
    );
  }
);
