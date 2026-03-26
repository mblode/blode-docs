import fs from "node:fs/promises";
import path from "node:path";

import { normalizePath, slugify } from "@repo/common";
import YAML from "yaml";

export interface OpenApiServer {
  url: string;
  description?: string;
}

export interface OpenApiSpec {
  openapi?: string;
  info?: { title?: string; description?: string };
  servers?: OpenApiServer[];
  paths?: Record<string, Record<string, OpenApiOperationSpec>>;
  components?: Record<string, unknown>;
}

export interface OpenApiOperationSpec {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Record<string, unknown>[];
  requestBody?: Record<string, unknown>;
  responses?: Record<string, unknown>;
}

export interface OpenApiOperation {
  id: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: Record<string, unknown>[];
  requestBody?: Record<string, unknown>;
  responses?: Record<string, unknown>;
}

export const parseOpenApiSpec = (raw: string, sourcePath = ""): OpenApiSpec => {
  const ext = path.extname(sourcePath).toLowerCase();

  if (ext === ".json") {
    return JSON.parse(raw) as OpenApiSpec;
  }

  if (ext === ".yaml" || ext === ".yml") {
    return YAML.parse(raw) as OpenApiSpec;
  }

  try {
    return JSON.parse(raw) as OpenApiSpec;
  } catch {
    return YAML.parse(raw) as OpenApiSpec;
  }
};

export const loadOpenApiSpec = async (
  absolutePath: string
): Promise<OpenApiSpec> =>
  parseOpenApiSpec(await fs.readFile(absolutePath, "utf8"), absolutePath);

export const openApiIdentifier = (method: string, routePath: string) =>
  `${method.toUpperCase()} ${routePath}`;

export const openApiSlug = (
  method: string,
  routePath: string,
  directory = "api"
) => {
  const normalized = normalizePath(routePath)
    .split("/")
    .map((segment) => segment.replaceAll(/[{}]/g, ""))
    .filter(Boolean)
    .join("-");
  const base = normalized.length ? normalized : "root";
  const slug = slugify(`${method.toLowerCase()}-${base}`);
  return normalizePath(path.join(directory, slug));
};

export const extractOpenApiOperations = (
  spec: OpenApiSpec,
  directory?: string
) => {
  const ops: OpenApiOperation[] = [];
  const paths = spec.paths ?? {};

  for (const [routePath, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const upper = method.toUpperCase();
      const id = operation.operationId ?? openApiIdentifier(upper, routePath);

      ops.push({
        description: operation.description,
        id,
        method: upper,
        parameters: operation.parameters ?? [],
        path: routePath,
        requestBody: operation.requestBody,
        responses: operation.responses,
        summary: operation.summary,
        tags: operation.tags ?? [],
      });
    }
  }

  const map = new Map<string, OpenApiOperation>();
  for (const op of ops) {
    const slug = openApiSlug(op.method, op.path, directory);
    map.set(slug, op);
  }

  return { bySlug: map, operations: ops };
};
