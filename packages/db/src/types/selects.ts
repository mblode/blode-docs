import { apiKeys, deployments, domains, projects } from "../schema";

export const projectSelect = {
  createdAt: projects.createdAt,
  deploymentName: projects.deploymentName,
  description: projects.description,
  id: projects.id,
  name: projects.name,
  slug: projects.slug,
  updatedAt: projects.updatedAt,
} as const;

export const domainSelect = {
  createdAt: domains.createdAt,
  hostname: domains.hostname,
  id: domains.id,
  pathPrefix: domains.pathPrefix,
  projectId: domains.projectId,
  status: domains.status,
  verifiedAt: domains.verifiedAt,
} as const;

export const deploymentSelect = {
  branch: deployments.branch,
  changes: deployments.changes,
  commitMessage: deployments.commitMessage,
  createdAt: deployments.createdAt,
  environment: deployments.environment,
  fileCount: deployments.fileCount,
  id: deployments.id,
  manifestUrl: deployments.manifestUrl,
  previewUrl: deployments.previewUrl,
  projectId: deployments.projectId,
  promotedAt: deployments.promotedAt,
  status: deployments.status,
  updatedAt: deployments.updatedAt,
} as const;

export const apiKeySelect = {
  createdAt: apiKeys.createdAt,
  id: apiKeys.id,
  lastUsedAt: apiKeys.lastUsedAt,
  name: apiKeys.name,
  prefix: apiKeys.prefix,
  projectId: apiKeys.projectId,
  revokedAt: apiKeys.revokedAt,
} as const;

export const apiKeyAuthSelect = {
  ...apiKeySelect,
  tokenHash: apiKeys.tokenHash,
} as const;
