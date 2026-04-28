import type { ProjectAnalytics } from "@repo/contracts";
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const domainStatusEnum = pgEnum("domain_status", [
  "valid_configuration",
  "pending_verification",
  "invalid_configuration",
]);

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "queued",
  "building",
  "successful",
  "failed",
]);

export const deploymentEnvironmentEnum = pgEnum("deployment_environment", [
  "production",
  "preview",
]);

export type DomainStatus = (typeof domainStatusEnum.enumValues)[number];
export type DeploymentStatus = (typeof deploymentStatusEnum.enumValues)[number];
export type DeploymentEnvironment =
  (typeof deploymentEnvironmentEnum.enumValues)[number];

const timestampColumn = (name: string) =>
  timestamp(name, { mode: "date", withTimezone: true });

export const users = pgTable(
  "users",
  {
    authId: text("auth_id").notNull(),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    email: text("email").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    updatedAt: timestampColumn("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_auth_id_key").on(table.authId),
    uniqueIndex("users_email_key").on(table.email),
  ]
).enableRLS();

export const projects = pgTable(
  "projects",
  {
    analytics: jsonb("analytics").$type<ProjectAnalytics>(),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    deploymentName: text("deployment_name").notNull(),
    description: text("description"),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    updatedAt: timestampColumn("updated_at").defaultNow().notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("projects_slug_key").on(table.slug),
    index("projects_user_id_idx").on(table.userId),
  ]
).enableRLS();

export const domains = pgTable(
  "domains",
  {
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    hostname: text("hostname").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    pathPrefix: text("path_prefix"),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: domainStatusEnum("status")
      .default("pending_verification")
      .notNull(),
    verifiedAt: timestampColumn("verified_at"),
  },
  (table) => [
    uniqueIndex("domains_hostname_key").on(table.hostname),
    index("domains_project_id_idx").on(table.projectId),
  ]
).enableRLS();

export const deployments = pgTable(
  "deployments",
  {
    branch: text("branch").notNull(),
    changes: text("changes"),
    commitMessage: text("commit_message"),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    environment: deploymentEnvironmentEnum("environment")
      .default("production")
      .notNull(),
    fileCount: integer("file_count"),
    id: uuid("id").defaultRandom().primaryKey(),
    manifestUrl: text("manifest_url"),
    previewUrl: text("preview_url"),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    promotedAt: timestampColumn("promoted_at"),
    status: deploymentStatusEnum("status").default("queued").notNull(),
    updatedAt: timestampColumn("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("deployments_project_id_created_at_idx").on(
      table.projectId,
      table.createdAt.desc()
    ),
  ]
).enableRLS();

export const gitProviderEnum = pgEnum("git_provider", ["github"]);

export type GitProvider = (typeof gitProviderEnum.enumValues)[number];

export const gitConnections = pgTable(
  "git_connections",
  {
    accountLogin: text("account_login").notNull(),
    branch: text("branch").default("main").notNull(),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    docsPath: text("docs_path").default("docs").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    installationId: bigint("installation_id", { mode: "number" }).notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: gitProviderEnum("provider").default("github").notNull(),
    repository: text("repository").notNull(),
    updatedAt: timestampColumn("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("git_connections_project_id_key").on(table.projectId)]
).enableRLS();

export const githubInstallations = pgTable(
  "github_installations",
  {
    accountLogin: text("account_login").notNull(),
    accountType: text("account_type").notNull(),
    createdAt: timestampColumn("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    installationId: bigint("installation_id", { mode: "number" }).notNull(),
    updatedAt: timestampColumn("updated_at").defaultNow().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("github_installations_user_install_key").on(
      table.userId,
      table.installationId
    ),
    index("github_installations_user_id_idx").on(table.userId),
    index("github_installations_installation_id_idx").on(table.installationId),
  ]
).enableRLS();
