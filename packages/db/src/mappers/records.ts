import type {
  Deployment,
  Domain,
  GitConnection,
  Project,
  User,
} from "@repo/contracts";

import type {
  DeploymentRecord,
  DomainRecord,
  GitConnectionRecord,
  ProjectRecord,
  UserRecord,
} from "../types/records.js";
import {
  mapDeploymentStatusToContract,
  mapDomainStatusToContract,
} from "./status-mappers.js";

const toIso = (value: Date) => value.toISOString();

export const mapUser = (record: UserRecord): User => ({
  createdAt: toIso(record.createdAt),
  email: record.email,
  id: record.id,
  name: record.name,
});

export const mapProject = (record: ProjectRecord): Project => ({
  analytics: record.analytics ?? null,
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

export const mapGitConnection = (
  record: GitConnectionRecord
): GitConnection => ({
  accountLogin: record.accountLogin,
  branch: record.branch,
  createdAt: toIso(record.createdAt),
  docsPath: record.docsPath,
  id: record.id,
  installationId: record.installationId,
  projectId: record.projectId,
  provider: record.provider,
  repository: record.repository,
  updatedAt: toIso(record.updatedAt),
});
