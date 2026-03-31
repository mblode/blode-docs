import type { Tenant, TenantResolution } from "@repo/contracts";

import {
  preferCustomDomain,
  rootDomain,
  validConfiguredDomainStatus,
} from "./config";
import { deploymentDao, domainDao, projectDao } from "./db";

export const buildTenant = async (
  projectId: string
): Promise<Tenant | null> => {
  const project = await projectDao.getById(projectId);
  if (!project) {
    return null;
  }

  const domains = await domainDao.listByProject(projectId);
  const deployment = await deploymentDao.getLatestPromotedByProject(projectId);
  const verifiedDomains = domains.filter(
    (domain) => domain.status === validConfiguredDomainStatus
  );
  const customDomains = verifiedDomains.map((domain) => domain.hostname);
  const preferredCustomDomain = verifiedDomains.at(-1) ?? null;
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
    pathPrefix: preferredCustomDomain?.pathPrefix ?? undefined,
    primaryDomain,
    slug: project.slug,
    status: "active",
    subdomain: project.slug,
  };
};

export const buildTenantResolution = (
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
