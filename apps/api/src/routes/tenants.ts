import { Hono } from "hono";
import { z } from "zod";

import { rootDomain, validConfiguredDomainStatus } from "../lib/config";
import { domainDao, projectDao } from "../lib/db";
import { normalizeHost, slugifyPath, stripPrefix } from "../lib/normalize";
import { notFound } from "../lib/responses";
import { buildTenant, buildTenantResolution } from "../lib/tenant-builder";
import { validateParams, validateQuery } from "../lib/validators";

const slugParamsSchema = z.object({ slug: z.string().min(1) });
const tenantResolveQuerySchema = z.object({
  host: z.string().min(1),
  path: z.string().optional(),
});

const isPresent = <T>(value: T | null): value is T => value !== null;
const DEFAULT_DOCS_BASE_PATH = "/docs";
const ROOT_TENANT_UTILITY_PATHS = new Set([
  "/llms-full.txt",
  "/llms.txt",
  "/robots.txt",
  "/sitemap.xml",
]);
const LOCAL_SUBDOMAIN_SUFFIXES = ["localhost", "127.0.0.1"];
const LOCAL_ROOT_HOSTS = new Set([
  ...LOCAL_SUBDOMAIN_SUFFIXES,
  "docs.localhost",
]);

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

export const tenants = new Hono();

tenants.get("/", async (c) => {
  const projects = await projectDao.list();
  const tenantList = await Promise.all(
    projects.map((project) => buildTenant(project.id))
  );
  return c.json(tenantList.filter(isPresent), 200);
});

tenants.get(
  "/resolve",
  validateQuery(tenantResolveQuerySchema),
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO: Refactor this handler by extracting resolution strategies into separate functions
  // oxlint-disable-next-line eslint/complexity
  async (c) => {
    const query = c.req.valid("query");
    const host = normalizeHost(query.host);
    const pathname = query.path ?? "/";

    const domain = await domainDao.getByHostname(host);
    if (domain && domain.status === validConfiguredDomainStatus) {
      const resolution = await resolveTenantByProjectId(
        domain.projectId,
        "custom-domain",
        host,
        pathname,
        domain.pathPrefix ?? ""
      );
      if (!resolution) {
        return notFound(c);
      }
      return c.json(resolution, 200);
    }

    const previewPrefix = host.includes("---") ? host.split("---")[0] : null;
    if (previewPrefix) {
      const project = await projectDao.getBySlugUnique(previewPrefix);
      if (project) {
        const resolution = await resolveTenantByProjectId(
          project.id,
          "preview",
          host,
          pathname,
          resolveSubdomainBasePath(pathname)
        );
        if (!resolution) {
          return notFound(c);
        }
        return c.json(resolution, 200);
      }
    }

    const localSuffix = LOCAL_ROOT_HOSTS.has(host)
      ? null
      : LOCAL_SUBDOMAIN_SUFFIXES.find((suffix) => host.endsWith(`.${suffix}`));
    if (localSuffix) {
      const subdomain = host.slice(0, -1 * (localSuffix.length + 1));
      if (subdomain) {
        const project = await projectDao.getBySlugUnique(subdomain);
        if (project) {
          const resolution = await resolveTenantByProjectId(
            project.id,
            "subdomain",
            host,
            pathname,
            resolveSubdomainBasePath(pathname)
          );
          if (!resolution) {
            return notFound(c);
          }
          return c.json(resolution, 200);
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
          const resolution = await resolveTenantByProjectId(
            project.id,
            "subdomain",
            host,
            pathname,
            resolveSubdomainBasePath(pathname)
          );
          if (!resolution) {
            return notFound(c);
          }
          return c.json(resolution, 200);
        }
      }
    }

    if (host === rootDomain || LOCAL_ROOT_HOSTS.has(host)) {
      const normalized = slugifyPath(pathname);
      const parts = normalized ? normalized.split("/") : [];
      const [projectSlug, ...rest] = parts;
      if (projectSlug) {
        const project = await projectDao.getBySlugUnique(projectSlug);
        if (project) {
          const tenant = await buildTenant(project.id);
          if (!tenant) {
            return notFound(c);
          }
          const remainder = rest.join("/");
          const rewrittenPath = remainder
            ? `/sites/${tenant.slug}/${remainder}`
            : `/sites/${tenant.slug}/`;
          return c.json(
            buildTenantResolution(
              tenant,
              "path",
              host,
              `/${tenant.slug}`,
              rewrittenPath
            ),
            200
          );
        }
      }
    }

    return notFound(c);
  }
);

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
