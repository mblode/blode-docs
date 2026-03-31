import { getLocalRootHostsFromEnv } from "@repo/common";
import { Hono } from "hono";
import { z } from "zod";

import { rootDomain, validConfiguredDomainStatus } from "../lib/config";
import { domainDao, projectDao } from "../lib/db";
import { normalizeHost, slugifyPath, stripPrefix } from "../lib/normalize";
import { authorizeAdminRequest } from "../lib/project-auth";
import { notFound, unauthorized } from "../lib/responses";
import { buildTenant, buildTenantResolution } from "../lib/tenant-builder";
import { validateParams, validateQuery } from "../lib/validators";

const slugParamsSchema = z.object({ slug: z.string().min(1) });
const tenantResolveQuerySchema = z.object({
  host: z.string().min(1),
  path: z.string().optional(),
});

type TenantResolutionResult = Awaited<
  ReturnType<typeof resolveTenantByProjectId>
>;
type ResolutionAttempt =
  | { matched: false }
  | { matched: true; resolution: TenantResolutionResult };

const isPresent = <T>(value: T | null): value is T => value !== null;
const DEFAULT_DOCS_BASE_PATH = "/docs";
const ROOT_TENANT_UTILITY_PATHS = new Set([
  "/llms-full.txt",
  "/llms.txt",
  "/robots.txt",
  "/sitemap.xml",
]);
const LOCAL_SUBDOMAIN_SUFFIXES = ["localhost", "127.0.0.1"];
const RESERVED_PLATFORM_SUBDOMAINS = new Set([
  "www",
  "app",
  "admin",
  "dashboard",
]);

const getLocalRootHosts = () => getLocalRootHostsFromEnv(process.env);
const noResolutionMatch = (): ResolutionAttempt => ({ matched: false });
const matchedResolution = (
  resolution: TenantResolutionResult
): ResolutionAttempt => ({ matched: true, resolution });

const resolveSubdomainBasePath = (pathname: string): string => {
  const normalizedPath = slugifyPath(pathname);

  if (
    normalizedPath === "docs" ||
    normalizedPath.startsWith(`${slugifyPath(DEFAULT_DOCS_BASE_PATH)}/`)
  ) {
    return DEFAULT_DOCS_BASE_PATH;
  }

  return "";
};

const buildTenantPathResolution = (
  tenant: NonNullable<Awaited<ReturnType<typeof buildTenant>>>,
  strategy: "preview" | "subdomain" | "custom-domain",
  host: string,
  pathname: string,
  basePath: string
) => {
  if (ROOT_TENANT_UTILITY_PATHS.has(pathname)) {
    return buildTenantResolution(
      tenant,
      strategy,
      host,
      basePath,
      `/sites/${tenant.slug}${pathname}`
    );
  }

  const slugPath = stripPrefix(pathname, basePath || null);
  if (slugPath === null) {
    return null;
  }
  const rewrittenPath = slugPath
    ? `/sites/${tenant.slug}/${slugPath}`
    : `/sites/${tenant.slug}/`;

  return buildTenantResolution(tenant, strategy, host, basePath, rewrittenPath);
};

const resolveTenantByProjectId = async (
  projectId: string,
  strategy: "preview" | "subdomain" | "custom-domain",
  host: string,
  pathname: string,
  basePath: string
) => {
  const tenant = await buildTenant(projectId);
  if (!tenant) {
    return null;
  }

  return buildTenantPathResolution(tenant, strategy, host, pathname, basePath);
};

const resolveTenantBySlug = async (
  slug: string,
  strategy: "preview" | "subdomain",
  host: string,
  pathname: string
): Promise<ResolutionAttempt> => {
  const project = await projectDao.getBySlugUnique(slug);
  if (!project) {
    return noResolutionMatch();
  }

  return matchedResolution(
    await resolveTenantByProjectId(
      project.id,
      strategy,
      host,
      pathname,
      resolveSubdomainBasePath(pathname)
    )
  );
};

const resolveCustomDomainTenant = async (
  host: string,
  pathname: string
): Promise<ResolutionAttempt> => {
  const domain = await domainDao.getByHostname(host);
  if (!domain || domain.status !== validConfiguredDomainStatus) {
    return noResolutionMatch();
  }

  return matchedResolution(
    await resolveTenantByProjectId(
      domain.projectId,
      "custom-domain",
      host,
      pathname,
      domain.pathPrefix ?? ""
    )
  );
};

const getPreviewSlug = (host: string): string | null => {
  if (!host.includes("---")) {
    return null;
  }

  return host.split("---")[0] || null;
};

const resolvePreviewTenant = async (
  host: string,
  pathname: string
): Promise<ResolutionAttempt> => {
  const previewSlug = getPreviewSlug(host);
  if (!previewSlug) {
    return noResolutionMatch();
  }

  return await resolveTenantBySlug(previewSlug, "preview", host, pathname);
};

const getLocalSubdomain = (
  host: string,
  localRootHosts: Set<string>
): string | null => {
  if (localRootHosts.has(host)) {
    return null;
  }

  const localSuffix = LOCAL_SUBDOMAIN_SUFFIXES.find((suffix) =>
    host.endsWith(`.${suffix}`)
  );
  if (!localSuffix) {
    return null;
  }

  return host.slice(0, -1 * (localSuffix.length + 1)) || null;
};

const resolveLocalSubdomainTenant = async (
  host: string,
  pathname: string,
  localRootHosts: Set<string>
): Promise<ResolutionAttempt> => {
  const subdomain = getLocalSubdomain(host, localRootHosts);
  if (!subdomain) {
    return noResolutionMatch();
  }

  return await resolveTenantBySlug(subdomain, "subdomain", host, pathname);
};

const getPlatformSubdomain = (host: string): string | null => {
  if (!host.endsWith(`.${rootDomain}`)) {
    return null;
  }

  const subdomain = host.slice(0, -1 * (rootDomain.length + 1));
  if (!subdomain || RESERVED_PLATFORM_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  return subdomain;
};

const resolvePlatformSubdomainTenant = async (
  host: string,
  pathname: string
): Promise<ResolutionAttempt> => {
  const subdomain = getPlatformSubdomain(host);
  if (!subdomain) {
    return noResolutionMatch();
  }

  return await resolveTenantBySlug(subdomain, "subdomain", host, pathname);
};

const isRootPathHost = (host: string, localRootHosts: Set<string>) =>
  host === rootDomain || localRootHosts.has(host);

const resolvePathTenant = async (
  host: string,
  pathname: string,
  localRootHosts: Set<string>
): Promise<ResolutionAttempt> => {
  if (!isRootPathHost(host, localRootHosts)) {
    return noResolutionMatch();
  }

  const normalized = slugifyPath(pathname);
  const parts = normalized ? normalized.split("/") : [];
  const [projectSlug, ...rest] = parts;
  if (!projectSlug) {
    return noResolutionMatch();
  }

  const project = await projectDao.getBySlugUnique(projectSlug);
  if (!project) {
    return noResolutionMatch();
  }

  const tenant = await buildTenant(project.id);
  if (!tenant) {
    return matchedResolution(null);
  }

  const remainder = rest.join("/");
  const rewrittenPath = remainder
    ? `/sites/${tenant.slug}/${remainder}`
    : `/sites/${tenant.slug}/`;

  return matchedResolution(
    buildTenantResolution(
      tenant,
      "path",
      host,
      `/${tenant.slug}`,
      rewrittenPath
    )
  );
};

const resolveTenantRequest = async (
  host: string,
  pathname: string
): Promise<ResolutionAttempt> => {
  const localRootHosts = getLocalRootHosts();
  const resolvers = [
    () => resolveCustomDomainTenant(host, pathname),
    () => resolvePreviewTenant(host, pathname),
    () => resolveLocalSubdomainTenant(host, pathname, localRootHosts),
    () => resolvePlatformSubdomainTenant(host, pathname),
    () => resolvePathTenant(host, pathname, localRootHosts),
  ];

  for (const resolve of resolvers) {
    const attempt = await resolve();
    if (attempt.matched) {
      return attempt;
    }
  }

  return noResolutionMatch();
};

const getResolutionResponse = (
  c: Parameters<typeof notFound>[0],
  attempt: ResolutionAttempt
): Response | null => {
  if (!attempt.matched) {
    return null;
  }

  return attempt.resolution ? c.json(attempt.resolution, 200) : notFound(c);
};

export const tenants = new Hono();

tenants.get("/", async (c) => {
  if (!authorizeAdminRequest(c)) {
    return unauthorized(c, "Invalid credentials.");
  }

  const projects = await projectDao.list();
  const tenantList = await Promise.all(
    projects.map((project) => buildTenant(project.id))
  );
  return c.json(tenantList.filter(isPresent), 200);
});

tenants.get("/resolve", validateQuery(tenantResolveQuerySchema), async (c) => {
  const query = c.req.valid("query");
  const host = normalizeHost(query.host);
  const pathname = query.path ?? "/";
  const response = getResolutionResponse(
    c,
    await resolveTenantRequest(host, pathname)
  );
  return response ?? notFound(c);
});

tenants.get("/:slug", validateParams(slugParamsSchema), async (c) => {
  const { slug } = c.req.valid("param");
  const project = await projectDao.getBySlugUnique(slug);
  if (!project) {
    return notFound(c);
  }
  const tenant = await buildTenant(project.id);
  if (!tenant) {
    return notFound(c);
  }
  return c.json(tenant, 200);
});
