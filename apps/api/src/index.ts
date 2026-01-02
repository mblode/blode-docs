import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { slugify } from "@repo/common";
import type {
  DomainVerification,
  Tenant,
  TenantResolution,
} from "@repo/contracts";
import {
  ActivitySchema,
  ApiKeyCreateSchema,
  ApiKeySchema,
  BootstrapRequestSchema,
  BootstrapResponseSchema,
  DeploymentSchema,
  DomainCreateResponseSchema,
  DomainCreateSchema,
  DomainSchema,
  DomainVerificationSchema,
  GitSettingsSchema,
  GitSettingsUpdateSchema,
  InviteMemberSchema,
  MemberSchema,
  ProjectSchema,
  ProjectUpdateSchema,
  TenantResolutionSchema,
  TenantSchema,
  WorkspaceCreateSchema,
  WorkspaceSchema,
} from "@repo/contracts";
import {
  ActivityDao,
  ApiKeyDao,
  DeploymentDao,
  DomainDao,
  GitConnectionDao,
  mapDomainStatusFromContract,
  ProfileDao,
  ProjectDao,
  WorkspaceDao,
  WorkspaceMemberDao,
} from "@repo/db";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";
import {
  addProjectDomain,
  deleteDomain,
  getProjectDomain,
  isVercelEnabled,
  removeProjectDomain,
  type VercelProjectDomain,
  verifyProjectDomain,
} from "./lib/vercel.js";
import {
  mapActivity,
  mapApiKey,
  mapDeployment,
  mapDomain,
  mapGitSettings,
  mapProject,
  mapWorkspace,
  mapWorkspaceMember,
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

app.register(cors, { origin: true, credentials: true });
app.register(sensible);
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

const workspaceDao = new WorkspaceDao();
const projectDao = new ProjectDao();
const domainDao = new DomainDao();
const deploymentDao = new DeploymentDao();
const gitConnectionDao = new GitConnectionDao();
const activityDao = new ActivityDao();
const apiKeyDao = new ApiKeyDao();
const workspaceMemberDao = new WorkspaceMemberDao();
const profileDao = new ProfileDao();

const domainCreateBodySchema = DomainCreateSchema.omit({ projectId: true });
const apiKeyCreateBodySchema = ApiKeyCreateSchema.omit({ workspaceId: true });
const rootDomain = process.env.PLATFORM_ROOT_DOMAIN ?? "neue.com";
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
    return undefined;
  }
  const records =
    domain.verification?.map((record: VerificationRecord) => ({
      type: (domainRecordTypes.has(record.type) ? record.type : "TXT") as
        | "A"
        | "AAAA"
        | "CNAME"
        | "TXT"
        | "MX"
        | "NS"
        | "CAA",
      name: record.domain,
      value: record.value,
    })) ?? [];

  return {
    verified: Boolean(domain.verified),
    records,
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

const slugifyPath = (value: string) => {
  const trimmed = value
    .replace(BACKSLASH_TO_SLASH_REGEX, "/")
    .replace(TRAILING_SLASHES_REGEX, "");
  return trimmed.replace(LEADING_SLASHES_REGEX, "");
};

const buildTenant = async (projectId: string): Promise<Tenant | null> => {
  const project = await projectDao.getById(projectId);
  if (!project) {
    return null;
  }
  const domains = await domainDao.listByProject(projectId);
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
    id: project.id,
    slug: project.slug,
    name: project.name,
    description: project.description ?? undefined,
    primaryDomain,
    subdomain: project.slug,
    customDomains,
    pathPrefix:
      domains.find((domain) => domain.pathPrefix)?.pathPrefix ?? undefined,
    status: "active",
  };
};

const buildTenantResolution = (
  tenant: Tenant,
  strategy: TenantResolution["strategy"],
  host: string,
  basePath: string,
  rewrittenPath: string
): TenantResolution => ({
  tenant,
  strategy,
  host,
  basePath,
  rewrittenPath,
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
  async () => ({
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
    return tenants.filter((tenant): tenant is NonNullable<typeof tenant> =>
      Boolean(tenant)
    );
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
      const [projectSlug, ...rest] = normalized.split("/").filter(Boolean);
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

app.post(
  "/bootstrap",
  {
    schema: {
      body: BootstrapRequestSchema,
      response: {
        200: BootstrapResponseSchema,
      },
    },
  },
  async (request) => {
    const { userId, email, fullName, avatarUrl } = request.body;
    await profileDao.upsert({
      id: userId,
      email,
      fullName: fullName ?? null,
      avatarUrl: avatarUrl ?? null,
    });

    const localPart = email.split("@")[0] ?? "workspace";
    const workspaceSlug = slugify(localPart) || "workspace";
    let workspace = await workspaceDao.getBySlug(workspaceSlug);
    if (!workspace) {
      workspace = await workspaceDao.create({
        slug: workspaceSlug,
        name: localPart,
      });
    }

    const existingMember = await workspaceMemberDao.getByWorkspaceEmail(
      workspace.id,
      email
    );
    if (!existingMember) {
      await workspaceMemberDao.create({
        workspaceId: workspace.id,
        email,
        role: "Owner",
        status: "Active",
        joinedAt: new Date(),
      });
    }

    const projects = await projectDao.listByWorkspace(workspace.id);
    let project = projects[0];
    if (!project) {
      project = await projectDao.create({
        workspaceId: workspace.id,
        slug: "docs",
        name: "Docs",
        deploymentName: "docs",
        description: "Documentation site.",
      });
    }

    return {
      workspace: mapWorkspace(workspace),
      project: mapProject(project),
    };
  }
);

app.get(
  "/workspaces",
  {
    schema: {
      response: {
        200: z.array(WorkspaceSchema),
      },
    },
  },
  async () => {
    const records = await workspaceDao.list();
    return records.map(mapWorkspace);
  }
);

app.post(
  "/workspaces",
  {
    schema: {
      body: WorkspaceCreateSchema,
      response: {
        201: WorkspaceSchema,
      },
    },
  },
  async (request, reply) => {
    const slug = request.body.slug ?? slugify(request.body.name);
    const record = await workspaceDao.create({
      name: request.body.name,
      slug,
    });
    return reply.code(201).send(mapWorkspace(record));
  }
);

app.get(
  "/workspaces/slug/:slug",
  {
    schema: {
      params: z.object({ slug: z.string().min(1) }),
      response: {
        200: WorkspaceSchema,
      },
    },
  },
  async (request, reply) => {
    const record = await workspaceDao.getBySlug(request.params.slug);
    if (!record) {
      return reply.notFound();
    }
    return mapWorkspace(record);
  }
);

app.get(
  "/workspaces/:workspaceId/projects",
  {
    schema: {
      params: z.object({ workspaceId: z.string().uuid() }),
      response: {
        200: z.array(ProjectSchema),
      },
    },
  },
  async (request) => {
    const records = await projectDao.listByWorkspace(
      request.params.workspaceId
    );
    return records.map(mapProject);
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
      params: z.object({ projectId: z.string().uuid() }),
      body: ProjectUpdateSchema,
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
      params: z.object({ projectId: z.string().uuid() }),
      body: domainCreateBodySchema,
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
      projectId: request.params.projectId,
      hostname,
      pathPrefix,
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
        projectId: z.string().uuid(),
        domainId: z.string().uuid(),
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
        verified:
          domain.status === mapDomainStatusFromContract("Valid Configuration"),
        records: [],
      };
    }

    try {
      const domainResponse = await getProjectDomain(domain.hostname);
      const verification = mapVerification(domainResponse) ?? {
        verified: Boolean(domainResponse.verified),
        records: [],
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
        projectId: z.string().uuid(),
        domainId: z.string().uuid(),
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
        verified:
          domain.status === mapDomainStatusFromContract("Valid Configuration"),
        records: [],
      };
    }

    try {
      const domainResponse = await verifyProjectDomain(domain.hostname);
      const verification = mapVerification(domainResponse) ?? {
        verified: Boolean(domainResponse.verified),
        records: [],
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
        projectId: z.string().uuid(),
        domainId: z.string().uuid(),
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

app.get(
  "/projects/:projectId/git",
  {
    schema: {
      params: z.object({ projectId: z.string().uuid() }),
      response: {
        200: GitSettingsSchema,
      },
    },
  },
  async (request, reply) => {
    const record = await gitConnectionDao.getByProject(
      request.params.projectId
    );
    if (!record) {
      return reply.notFound();
    }
    return mapGitSettings(record);
  }
);

app.patch(
  "/projects/:projectId/git",
  {
    schema: {
      params: z.object({ projectId: z.string().uuid() }),
      body: GitSettingsUpdateSchema,
      response: {
        200: GitSettingsSchema,
      },
    },
  },
  async (request, reply) => {
    const existing = await gitConnectionDao.getByProject(
      request.params.projectId
    );
    if (!existing) {
      if (
        !(
          request.body.organization &&
          request.body.repository &&
          request.body.branch
        )
      ) {
        return reply.badRequest(
          "Organization, repository, and branch are required."
        );
      }
      const created = await gitConnectionDao.create({
        projectId: request.params.projectId,
        organization: request.body.organization,
        repository: request.body.repository,
        branch: request.body.branch,
        isMonorepo: request.body.isMonorepo ?? false,
        docsPath: request.body.docsPath ?? null,
      });
      return mapGitSettings(created);
    }

    const record = await gitConnectionDao.update(existing.id, {
      organization: request.body.organization ?? undefined,
      repository: request.body.repository ?? undefined,
      branch: request.body.branch ?? undefined,
      isMonorepo: request.body.isMonorepo ?? undefined,
      docsPath:
        request.body.docsPath === undefined ? undefined : request.body.docsPath,
    });
    return mapGitSettings(record);
  }
);

app.get(
  "/projects/:projectId/activity",
  {
    schema: {
      params: z.object({ projectId: z.string().uuid() }),
      response: {
        200: z.array(ActivitySchema),
      },
    },
  },
  async (request) => {
    const records = await activityDao.listByProject(request.params.projectId);
    return records.map(mapActivity);
  }
);

app.get(
  "/workspaces/:workspaceId/members",
  {
    schema: {
      params: z.object({ workspaceId: z.string().uuid() }),
      response: {
        200: z.array(MemberSchema),
      },
    },
  },
  async (request) => {
    const records = await workspaceMemberDao.listByWorkspace(
      request.params.workspaceId
    );
    return records.map(mapWorkspaceMember);
  }
);

app.post(
  "/workspaces/:workspaceId/members",
  {
    schema: {
      params: z.object({ workspaceId: z.string().uuid() }),
      body: InviteMemberSchema,
      response: {
        201: MemberSchema,
      },
    },
  },
  async (request, reply) => {
    const roleMap = {
      owner: "Owner",
      admin: "Admin",
      member: "Member",
    } as const;
    const roleKey = request.body.role ?? "member";
    const record = await workspaceMemberDao.create({
      workspaceId: request.params.workspaceId,
      email: request.body.email,
      role: roleMap[roleKey],
      status: "Invited",
    });
    return reply.code(201).send(mapWorkspaceMember(record));
  }
);

app.get(
  "/workspaces/:workspaceId/api-keys",
  {
    schema: {
      params: z.object({ workspaceId: z.string().uuid() }),
      response: {
        200: z.array(ApiKeySchema),
      },
    },
  },
  async (request) => {
    const records = await apiKeyDao.listByWorkspace(request.params.workspaceId);
    return records.map(mapApiKey);
  }
);

app.post(
  "/workspaces/:workspaceId/api-keys",
  {
    schema: {
      params: z.object({ workspaceId: z.string().uuid() }),
      body: apiKeyCreateBodySchema,
      response: {
        201: ApiKeySchema,
      },
    },
  },
  async (request, reply) => {
    const prefix = `nk_${randomUUID().slice(0, 8)}`;
    const record = await apiKeyDao.create({
      workspaceId: request.params.workspaceId,
      name: request.body.name,
      prefix,
    });
    return reply.code(201).send(mapApiKey(record));
  }
);

const start = async () => {
  try {
    const port = Number(process.env.PORT ?? 4000);
    await app.listen({ port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
  start();
}
