import type {
  deployments,
  domains,
  gitConnections,
  githubInstallations,
  projects,
  users,
} from "../schema.js";

type UserRow = typeof users.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;
type DomainRow = typeof domains.$inferSelect;
type DeploymentRow = typeof deployments.$inferSelect;
type GitConnectionRow = typeof gitConnections.$inferSelect;
type GithubInstallationRow = typeof githubInstallations.$inferSelect;

export type UserRecord = Pick<
  UserRow,
  "authId" | "createdAt" | "email" | "id" | "name" | "updatedAt"
>;

export type ProjectRecord = Pick<
  ProjectRow,
  | "createdAt"
  | "deploymentName"
  | "description"
  | "id"
  | "name"
  | "slug"
  | "updatedAt"
  | "userId"
>;

export type DomainRecord = Pick<
  DomainRow,
  | "createdAt"
  | "hostname"
  | "id"
  | "pathPrefix"
  | "projectId"
  | "status"
  | "verifiedAt"
>;

export type DeploymentRecord = Pick<
  DeploymentRow,
  | "branch"
  | "changes"
  | "commitMessage"
  | "createdAt"
  | "environment"
  | "fileCount"
  | "id"
  | "manifestUrl"
  | "previewUrl"
  | "projectId"
  | "promotedAt"
  | "status"
  | "updatedAt"
>;

export type GitConnectionRecord = Pick<
  GitConnectionRow,
  | "accountLogin"
  | "branch"
  | "createdAt"
  | "docsPath"
  | "id"
  | "installationId"
  | "projectId"
  | "provider"
  | "repository"
  | "updatedAt"
>;

export type GithubInstallationRecord = Pick<
  GithubInstallationRow,
  | "accountLogin"
  | "accountType"
  | "createdAt"
  | "id"
  | "installationId"
  | "updatedAt"
  | "userId"
>;
