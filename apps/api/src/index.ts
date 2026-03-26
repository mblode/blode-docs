// oxlint-disable oxc/no-async-endpoint-handlers, eslint/complexity
import { Buffer } from "node:buffer";

import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import type {
  DomainVerification,
  Tenant,
  TenantResolution,
} from "@repo/contracts";
import {
  ApiKeyCreateSchema,
  ApiKeyCreateResponseSchema,
  ApiKeySchema,
  DeploymentSchema,
  DomainCreateResponseSchema,
  DomainCreateSchema,
  DomainSchema,
  DomainVerificationSchema,
  PublishDeploymentCreateSchema,
  PublishDeploymentFileResponseSchema,
  PublishDeploymentFileSchema,
  PublishDeploymentFinalizeSchema,
  ProjectSchema,
  ProjectUpdateSchema,
  TenantResolutionSchema,
  TenantSchema,
} from "@repo/contracts";
import {
  ApiKeyDao,
  DeploymentDao,
  DomainDao,
  mapDomainStatusFromContract,
  ProjectDao,
} from "@repo/db";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { authenticateApiKey, createApiKeyToken } from "./lib/api-key-auth.js";
import {
  finalizeDeploymentManifest,
  uploadDeploymentFile,
} from "./lib/publish.js";
import { revalidateProject } from "./lib/revalidate.js";
import {
  addProjectDomain,
  deleteDomain,
  getProjectDomain,
  isVercelEnabled,
  removeProjectDomain,
  verifyProjectDomain,
} from "./lib/vercel.js";
import type { VercelProjectDomain } from "./lib/vercel.js";
import {
  mapApiKey,
  mapDeployment,
  mapDomain,
  mapProject,
} from "./mappers/records.js";

// Regex patterns for string normalization
const PORT_REGEX = /:\d+$/;
const PROTOCOL_REGEX = /^https?:\/\//;
const TRAILING_SLASHES_REGEX = /\/+$/;
const LEADING_SLASHES_REGEX = /^\/+/;
const BACKSLASH_TO_SLASH_REGEX = /\\/g;

export const app = Fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>();

app.register(cors, { credentials: true, origin: true });
app.register(sensible);
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

const projectDao = new ProjectDao();
const domainDao = new DomainDao();
const deploymentDao = new DeploymentDao();
const apiKeyDao = new ApiKeyDao();

const domainCreateBodySchema = DomainCreateSchema.omit({ projectId: true });
const apiKeyCreateBodySchema = ApiKeyCreateSchema.omit({ projectId: true });
const rootDomain = process.env.PLATFORM_ROOT_DOMAIN ?? "blode.md";
const autoWwwRedirect = process.env.VERCEL_AUTO_WWW_REDIRECT === "true";
const preferCustomDomain = process.env.PREFER_CUSTOM_DOMAIN === "true";

const domainRecordTypes = new Set([
  "A",
  "AAAA",
  "CNAME",
  "TXT",
  "MX",
  "NS",
  "CAA",
]);

const toDomainStatus = (verified: boolean) =>
  mapDomainStatusFromContract(
    verified ? "Valid Configuration" : "Pending Verification"
  );

type VerificationRecord = NonNullable<
  VercelProjectDomain["verification"]
>[number];

const mapVerification = (domain: VercelProjectDomain | null) => {
  if (!domain) {
    return;
  }
  const records =
    domain.verification?.map((record: VerificationRecord) => ({
      name: record.domain,
      type: (domainRecordTypes.has(record.type) ? record.type : "TXT") as
        | "A"
        | "AAAA"
        | "CNAME"
        | "TXT"
        | "MX"
        | "NS"
        | "CAA",
      value: record.value,
    })) ?? [];

  return {
    records,
    verified: Boolean(domain.verified),
  };
};

const normalizeHost = (host: string) =>
  host.replace(PORT_REGEX, "").toLowerCase();
const normalizeHostnameInput = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(PROTOCOL_REGEX, "");
  const withoutPath = withoutProtocol.split("/")[0] ?? "";
  return normalizeHost(withoutPath);
};

const normalizePathPrefix = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(TRAILING_SLASHES_REGEX, "");
};

const slugifyPath = (value: string) => {
  const trimmed = value
    .replace(BACKSLASH_TO_SLASH_REGEX, "/")
    .replace(TRAILING_SLASHES_REGEX, "");
  return trimmed.replace(LEADING_SLASHES_REGEX, "");
};

const stripPrefix = (pathname: string, prefix: string | null) => {
  if (!prefix) {
    return slugifyPath(pathname);
  }
  const normalizedPath = slugifyPath(pathname);
  const normalizedPrefix = slugifyPath(prefix);
  if (!normalizedPrefix) {
    return normalizedPath;
  }
  if (normalizedPath === normalizedPrefix) {
    return "";
  }
  if (normalizedPath.startsWith(`${normalizedPrefix}/`)) {
    return normalizedPath.slice(normalizedPrefix.length + 1);
  }
  return normalizedPath;
};

const isPresent = <T>(value: T | null): value is T => value !== null;

const buildTenant = async (projectId: string): Promise<Tenant | null> => {
  const project = await projectDao.getById(projectId);
  if (!project) {
    return null;
  }

  const domains = await domainDao.listByProject(projectId);
  const deployment = await deploymentDao.getLatestPromotedByProject(projectId);
  const customDomains = domains.map((domain) => domain.hostname);
  const preferredCustomDomain =
    domains.find(
      (domain) =>
        domain.status === mapDomainStatusFromContract("Valid Configuration")
    ) ??
    domains[0] ??
    null;
  const primaryDomain =
    preferCustomDomain && preferredCustomDomain
      ? preferredCustomDomain.hostname
      : `${project.slug}.${rootDomain}`;
  return {
    activeDeploymentId: deployment?.manifestUrl ? deployment.id : undefined,
    activeDeploymentManifestUrl: deployment?.manifestUrl ?? undefined,
    customDomains,
    description: project.description ?? undefined,
    id: project.id,
    name: project.name,
    pathPrefix:
      domains.find((domain) => domain.pathPrefix)?.pathPrefix ?? undefined,
    primaryDomain,
    slug: project.slug,
    status: "active",
    subdomain: project.slug,
  };
};

const buildTenantResolution = (
  tenant: Tenant,
  strategy: TenantResolution["strategy"],
  host: string,
  basePath: string,
  rewrittenPath: string
): TenantResolution => ({
  basePath,
  host,
  rewrittenPath,
  strategy,
  tenant,
});

app.get(
  "/health",
  {
    schema: {
      response: {
        200: z.object({
          ok: z.literal(true),
          timestamp: z.string().datetime(),
        }),
      },
    },
  },
  () => ({
    ok: true as const,
    timestamp: new Date().toISOString(),
  })
);

app.get(
  "/tenants",
  {
    schema: {
      response: {
        200: z.array(TenantSchema),
      },
    },
  },
  async () => {
    const projects = await projectDao.list();
    const tenants = await Promise.all(
      projects.map((project) => buildTenant(project.id))
    );
    return tenants.filter(isPresent);
  }
);

app.get(
  "/tenants/:slug",
  {
    schema: {
      params: z.object({ slug: z.string().min(1) }),
      response: {
        200: TenantSchema,
      },
    },
  },
  async (request, reply) => {
    const project = await projectDao.getBySlugUnique(request.params.slug);
    if (!project) {
      return reply.notFound();
    }
    const tenant = await buildTenant(project.id);
    if (!tenant) {
      return reply.notFound();
    }
    return tenant;
  }
);

app.get(
  "/tenants/resolve",
  {
    schema: {
      querystring: z.object({
        host: z.string().min(1),
        path: z.string().optional(),
      }),
      response: {
        200: TenantResolutionSchema,
      },
    },
  },
  // oxlint-disable-next-line eslint/complexity
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO: Refactor this handler by extracting resolution strategies into separate functions
  async (request, reply) => {
    const host = normalizeHost(request.query.host);
    const pathname = request.query.path ?? "/";

    const previewPrefix = host.includes("---") ? host.split("---")[0] : null;
    if (previewPrefix) {
      const project = await projectDao.getBySlugUnique(previewPrefix);
      if (project) {
        const tenant = await buildTenant(project.id);
        if (!tenant) {
          return reply.notFound();
        }
        const slugPath = slugifyPath(pathname);
        const rewrittenPath = slugPath
          ? `/sites/${tenant.slug}/${slugPath}`
          : `/sites/${tenant.slug}/`;
        return buildTenantResolution(
          tenant,
          "preview",
          host,
          "",
          rewrittenPath
        );
      }
    }

    const domain = await domainDao.getByHostname(host);
    if (domain) {
      const tenant = await buildTenant(domain.projectId);
      if (!tenant) {
        return reply.notFound();
      }
      const slugPath = stripPrefix(pathname, domain.pathPrefix ?? null);
      const rewrittenPath = slugPath
        ? `/sites/${tenant.slug}/${slugPath}`
        : `/sites/${tenant.slug}/`;
      return buildTenantResolution(
        tenant,
        "custom-domain",
        host,
        domain.pathPrefix ?? "",
        rewrittenPath
      );
    }

    const localSuffixes = ["localhost", "127.0.0.1"];
    const localSuffix = localSuffixes.find((suffix) =>
      host.endsWith(`.${suffix}`)
    );
    if (localSuffix) {
      const subdomain = host.slice(0, -1 * (localSuffix.length + 1));
      if (subdomain) {
        const project = await projectDao.getBySlugUnique(subdomain);
        if (project) {
          const tenant = await buildTenant(project.id);
          if (!tenant) {
            return reply.notFound();
          }
          const slugPath = slugifyPath(pathname);
          const rewrittenPath = slugPath
            ? `/sites/${tenant.slug}/${slugPath}`
            : `/sites/${tenant.slug}/`;
          return buildTenantResolution(
            tenant,
            "subdomain",
            host,
            "",
            rewrittenPath
          );
        }
      }
    }

    if (host.endsWith(`.${rootDomain}`)) {
      const subdomain = host.slice(0, -1 * (rootDomain.length + 1));
      if (
        subdomain &&
        !["www", "app", "admin", "dashboard"].includes(subdomain)
      ) {
        const project = await projectDao.getBySlugUnique(subdomain);
        if (project) {
          const tenant = await buildTenant(project.id);
          if (!tenant) {
            return reply.notFound();
          }
          const slugPath = slugifyPath(pathname);
          const rewrittenPath = slugPath
            ? `/sites/${tenant.slug}/${slugPath}`
            : `/sites/${tenant.slug}/`;
          return buildTenantResolution(
            tenant,
            "subdomain",
            host,
            "",
            rewrittenPath
          );
        }
      }
    }

    if (host === rootDomain || localSuffixes.includes(host)) {
      const normalized = slugifyPath(pathname);
      const parts = normalized ? normalized.split("/") : [];
      const [projectSlug, ...rest] = parts;
      if (projectSlug) {
        const project = await projectDao.getBySlugUnique(projectSlug);
        if (project) {
          const tenant = await buildTenant(project.id);
          if (!tenant) {
            return reply.notFound();
          }
          const remainder = rest.join("/");
          const rewrittenPath = remainder
            ? `/sites/${tenant.slug}/${remainder}`
            : `/sites/${tenant.slug}/`;
          return buildTenantResolution(
            tenant,
            "path",
            host,
            `/${tenant.slug}`,
            rewrittenPath
          );
        }
      }
    }

    return reply.notFound();
  }
);

app.get(
  "/projects/:projectId",
  {
    schema: {
      params: z.object({ projectId: z.string().uuid() }),
      response: {
        200: ProjectSchema,
      },
    },
  },
  async (request, reply) => {
    const record = await projectDao.getById(request.params.projectId);
    if (!record) {
      return reply.notFound();
    }
    return mapProject(record);
  }
);

app.patch(
  "/projects/:projectId",
  {
    schema: {
      body: ProjectUpdateSchema,
      params: z.object({ projectId: z.string().uuid() }),
      response: {
        200: ProjectSchema,
      },
    },
  },
  async (request, reply) => {
    const existing = await projectDao.getById(request.params.projectId);
    if (!existing) {
      return reply.notFound();
    }
    const record = await projectDao.update(
      request.params.projectId,
      request.body
    );
    return mapProject(record);
  }
);

app.get(
  "/projects/:projectId/domains",
  {
    schema: {
      params: z.object({ projectId: z.string().uuid() }),
      response: {
        200: z.array(DomainSchema),
      },
    },
  },
  async (request) => {
    const records = await domainDao.listByProject(request.params.projectId);
    return records.map(mapDomain);
  }
);

app.post(
  "/projects/:projectId/domains",
  {
    schema: {
      body: domainCreateBodySchema,
      params: z.object({ projectId: z.string().uuid() }),
      response: {
        201: DomainCreateResponseSchema,
      },
    },
  },
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO: Refactor this handler by extracting domain provisioning logic into separate functions
  async (request, reply) => {
    const hostname = normalizeHostnameInput(request.body.hostname);
    if (!hostname) {
      return reply.badRequest("Domain hostname is required.");
    }
    if (hostname === rootDomain || hostname.endsWith(`.${rootDomain}`)) {
      return reply.badRequest("Domain must be external to the neue.com zone.");
    }
    let verification: DomainVerification | undefined;
    let status = mapDomainStatusFromContract("Pending Verification");
    let verifiedAt: Date | null = null;
    const pathPrefix = normalizePathPrefix(request.body.pathPrefix);

    if (isVercelEnabled()) {
      try {
        const domainResponse = await addProjectDomain(hostname);
        verification = mapVerification(domainResponse);
        const isVerified = Boolean(domainResponse.verified);
        status = toDomainStatus(isVerified);
        verifiedAt = isVerified ? new Date() : null;

        if (!isVerified) {
          const verifyResponse = await verifyProjectDomain(hostname).catch(
            () => null
          );
          if (verifyResponse) {
            verification = mapVerification(verifyResponse);
            const verifiedNow = Boolean(verifyResponse.verified);
            status = toDomainStatus(verifiedNow);
            verifiedAt = verifiedNow ? new Date() : null;
          }
        }

        if (autoWwwRedirect && !hostname.startsWith("www.")) {
          const parts = hostname.split(".");
          if (parts.length === 2) {
            await addProjectDomain(`www.${hostname}`, hostname).catch(
              () => null
            );
          }
        }
      } catch (error) {
        request.log.error({ error }, "Failed to provision Vercel domain");
        return reply.badGateway("Unable to provision domain");
      }
    }

    const record = await domainDao.create({
      hostname,
      pathPrefix,
      projectId: request.params.projectId,
      status,
      verifiedAt,
    });

    return reply.code(201).send({ domain: mapDomain(record), verification });
  }
);

app.get(
  "/projects/:projectId/domains/:domainId/verification",
  {
    schema: {
      params: z.object({
        domainId: z.string().uuid(),
        projectId: z.string().uuid(),
      }),
      response: {
        200: DomainVerificationSchema,
      },
    },
  },
  async (request, reply) => {
    const domain = await domainDao.getById(request.params.domainId);
    if (!domain || domain.projectId !== request.params.projectId) {
      return reply.notFound();
    }

    if (!isVercelEnabled()) {
      return {
        records: [],
        verified:
          domain.status === mapDomainStatusFromContract("Valid Configuration"),
      };
    }

    try {
      const domainResponse = await getProjectDomain(domain.hostname);
      const verification = mapVerification(domainResponse) ?? {
        records: [],
        verified: Boolean(domainResponse.verified),
      };
      if (verification.verified && !domain.verifiedAt) {
        await domainDao.update(domain.id, {
          status: toDomainStatus(true),
          verifiedAt: new Date(),
        });
      }
      return verification;
    } catch (error) {
      request.log.error({ error }, "Failed to fetch domain verification");
      return reply.badGateway("Unable to fetch domain verification");
    }
  }
);

app.post(
  "/projects/:projectId/domains/:domainId/verify",
  {
    schema: {
      params: z.object({
        domainId: z.string().uuid(),
        projectId: z.string().uuid(),
      }),
      response: {
        200: DomainVerificationSchema,
      },
    },
  },
  async (request, reply) => {
    const domain = await domainDao.getById(request.params.domainId);
    if (!domain || domain.projectId !== request.params.projectId) {
      return reply.notFound();
    }

    if (!isVercelEnabled()) {
      return {
        records: [],
        verified:
          domain.status === mapDomainStatusFromContract("Valid Configuration"),
      };
    }

    try {
      const domainResponse = await verifyProjectDomain(domain.hostname);
      const verification = mapVerification(domainResponse) ?? {
        records: [],
        verified: Boolean(domainResponse.verified),
      };
      if (verification.verified) {
        await domainDao.update(domain.id, {
          status: toDomainStatus(true),
          verifiedAt: new Date(),
        });
      }
      return verification;
    } catch (error) {
      request.log.error({ error }, "Failed to verify domain");
      return reply.badGateway("Unable to verify domain");
    }
  }
);

app.delete(
  "/projects/:projectId/domains/:domainId",
  {
    schema: {
      params: z.object({
        domainId: z.string().uuid(),
        projectId: z.string().uuid(),
      }),
      response: {
        204: z.null(),
      },
    },
  },
  async (request, reply) => {
    const domain = await domainDao.getById(request.params.domainId);
    if (!domain || domain.projectId !== request.params.projectId) {
      return reply.notFound();
    }

    if (isVercelEnabled()) {
      try {
        await removeProjectDomain(domain.hostname, true);
        await deleteDomain(domain.hostname).catch((error: unknown) => {
          request.log.warn({ error }, "Failed to delete Vercel domain");
        });
      } catch (error) {
        request.log.error({ error }, "Failed to remove Vercel domain");
        return reply.badGateway("Unable to remove domain");
      }
    }

    await domainDao.delete(domain.id);
    return reply.code(204).send(null);
  }
);

app.get(
  "/projects/:projectId/deployments",
  {
    schema: {
      params: z.object({ projectId: z.string().uuid() }),
      response: {
        200: z.array(DeploymentSchema),
      },
    },
  },
  async (request) => {
    const records = await deploymentDao.listByProject(request.params.projectId);
    return records.map(mapDeployment);
  }
);

app.patch(
  "/projects/:projectId/deployments/:deploymentId",
  {
    schema: {
      params: z.object({
        deploymentId: z.string().uuid(),
        projectId: z.string().uuid(),
      }),
      response: {
        200: DeploymentSchema,
      },
    },
  },
  async (request, reply) => {
    const deployment = await deploymentDao.getByProjectId(
      request.params.projectId,
      request.params.deploymentId
    );
    if (!deployment) {
      return reply.notFound();
    }
    const record = await deploymentDao.update(deployment.id, {
      promotedAt: new Date(),
      status: "successful",
    });
    return mapDeployment(record);
  }
);

app.post(
  "/projects/slug/:slug/deployments",
  {
    schema: {
      body: PublishDeploymentCreateSchema,
      params: z.object({ slug: z.string().min(1) }),
      response: {
        201: DeploymentSchema,
      },
    },
  },
  async (request, reply) => {
    const apiKey = await authenticateApiKey(
      request.headers as Record<string, unknown>,
      apiKeyDao
    );
    if (!apiKey) {
      return reply.unauthorized("Invalid API key.");
    }

    const project = await projectDao.getBySlugUnique(request.params.slug);
    if (!project || project.id !== apiKey.projectId) {
      return reply.notFound();
    }

    if (request.body.environment === "preview") {
      return reply.badRequest("Preview deployments are not supported.");
    }

    const record = await deploymentDao.create({
      branch: request.body.branch ?? "main",
      changes: request.body.changes ?? null,
      commitMessage: request.body.commitMessage ?? null,
      environment: "production",
      projectId: project.id,
      status: "building",
    });
    return reply.code(201).send(mapDeployment(record));
  }
);

app.post(
  "/projects/slug/:slug/deployments/:deploymentId/files",
  {
    schema: {
      body: PublishDeploymentFileSchema,
      params: z.object({
        deploymentId: z.string().uuid(),
        slug: z.string().min(1),
      }),
      response: {
        200: PublishDeploymentFileResponseSchema,
      },
    },
  },
  async (request, reply) => {
    const apiKey = await authenticateApiKey(
      request.headers as Record<string, unknown>,
      apiKeyDao
    );
    if (!apiKey) {
      return reply.unauthorized("Invalid API key.");
    }

    const project = await projectDao.getBySlugUnique(request.params.slug);
    if (!project || project.id !== apiKey.projectId) {
      return reply.notFound();
    }

    const deployment = await deploymentDao.getByProjectId(
      project.id,
      request.params.deploymentId
    );
    if (!deployment) {
      return reply.notFound();
    }

    if (!["building", "queued"].includes(deployment.status)) {
      return reply.badRequest("Deployment is not accepting files.");
    }

    try {
      const content = Buffer.from(request.body.contentBase64, "base64");
      return await uploadDeploymentFile({
        content,
        contentType: request.body.contentType,
        deploymentId: deployment.id,
        projectSlug: project.slug,
        relativePath: request.body.path,
      });
    } catch (error) {
      request.log.error({ error }, "Failed to upload deployment file");
      return reply.badRequest(
        error instanceof Error ? error.message : "Unable to upload file."
      );
    }
  }
);

app.post(
  "/projects/slug/:slug/deployments/:deploymentId/finalize",
  {
    schema: {
      body: PublishDeploymentFinalizeSchema,
      params: z.object({
        deploymentId: z.string().uuid(),
        slug: z.string().min(1),
      }),
      response: {
        200: DeploymentSchema,
      },
    },
  },
  async (request, reply) => {
    const apiKey = await authenticateApiKey(
      request.headers as Record<string, unknown>,
      apiKeyDao
    );
    if (!apiKey) {
      return reply.unauthorized("Invalid API key.");
    }

    const project = await projectDao.getBySlugUnique(request.params.slug);
    if (!project || project.id !== apiKey.projectId) {
      return reply.notFound();
    }

    const deployment = await deploymentDao.getByProjectId(
      project.id,
      request.params.deploymentId
    );
    if (!deployment) {
      return reply.notFound();
    }

    try {
      const manifest = await finalizeDeploymentManifest({
        deploymentId: deployment.id,
        projectSlug: project.slug,
      });
      const shouldPromote = request.body.promote !== false;
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
          request.log.warn({ error }, "Failed to revalidate docs project");
        }
      }

      return mapDeployment(updated);
    } catch (error) {
      await deploymentDao.update(deployment.id, { status: "failed" });
      request.log.error({ error }, "Failed to finalize deployment");
      return reply.badRequest(
        error instanceof Error
          ? error.message
          : "Unable to finalize deployment."
      );
    }
  }
);

app.get(
  "/projects/:projectId/api-keys",
  {
    schema: {
      params: z.object({ projectId: z.string().uuid() }),
      response: {
        200: z.array(ApiKeySchema),
      },
    },
  },
  async (request) => {
    const records = await apiKeyDao.listByProject(request.params.projectId);
    return records.map(mapApiKey);
  }
);

app.post(
  "/projects/:projectId/api-keys",
  {
    schema: {
      body: apiKeyCreateBodySchema,
      params: z.object({ projectId: z.string().uuid() }),
      response: {
        201: ApiKeyCreateResponseSchema,
      },
    },
  },
  async (request, reply) => {
    const { prefix, token, tokenHash } = createApiKeyToken();
    const record = await apiKeyDao.create({
      name: request.body.name,
      prefix,
      projectId: request.params.projectId,
      tokenHash,
    });
    return reply.code(201).send({
      apiKey: mapApiKey(record),
      token,
    });
  }
);

const start = async () => {
  try {
    const port = Number(process.env.PORT ?? 4000);
    await app.listen({ host: "0.0.0.0", port });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
  start();
}
