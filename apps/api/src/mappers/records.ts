import type { ApiKey, Deployment, Domain, Project } from "@repo/contracts";
import type {
  ApiKeyRecord,
  DeploymentRecord,
  DomainRecord,
  ProjectRecord,
} from "@repo/db";
import {
  mapDeploymentStatusToContract,
  mapDomainStatusToContract,
} from "@repo/db";

const toIso = (value: Date) => value.toISOString();

export const mapProject = (record: ProjectRecord): Project => ({
  createdAt: toIso(record.createdAt),
  deploymentName: record.deploymentName,
  description: record.description ?? undefined,
  id: record.id,
  name: record.name,
  slug: record.slug,
  updatedAt: toIso(record.updatedAt),
});

export const mapDomain = (record: DomainRecord): Domain => ({
  createdAt: toIso(record.createdAt),
  hostname: record.hostname,
  id: record.id,
  pathPrefix: record.pathPrefix ?? undefined,
  projectId: record.projectId,
  status: mapDomainStatusToContract(record.status),
  verifiedAt: record.verifiedAt ? toIso(record.verifiedAt) : undefined,
});

export const mapDeployment = (record: DeploymentRecord): Deployment => ({
  branch: record.branch,
  changes: record.changes ?? undefined,
  commitMessage: record.commitMessage ?? undefined,
  createdAt: toIso(record.createdAt),
  environment: record.environment === "preview" ? "preview" : "production",
  fileCount: record.fileCount ?? undefined,
  id: record.id,
  manifestUrl: record.manifestUrl ?? undefined,
  previewUrl: record.previewUrl ?? undefined,
  projectId: record.projectId,
  promotedAt: record.promotedAt ? toIso(record.promotedAt) : undefined,
  status: mapDeploymentStatusToContract(record.status),
  updatedAt: toIso(record.updatedAt),
});

export const mapApiKey = (record: ApiKeyRecord): ApiKey => ({
  createdAt: toIso(record.createdAt),
  id: record.id,
  lastUsedAt: record.lastUsedAt ? toIso(record.lastUsedAt) : undefined,
  name: record.name,
  prefix: record.prefix,
  projectId: record.projectId,
  revokedAt: record.revokedAt ? toIso(record.revokedAt) : undefined,
});
