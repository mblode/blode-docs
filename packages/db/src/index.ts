import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { Prisma } from "@prisma/client";
// biome-ignore lint/performance/noBarrelFile: This is the main entry point for the package
export { ActivityDao } from "./daos/activity-dao.js";
export { ApiKeyDao } from "./daos/api-key-dao.js";
export { DeploymentDao } from "./daos/deployment-dao.js";
export { DomainDao } from "./daos/domain-dao.js";
export { GitConnectionDao } from "./daos/git-connection-dao.js";
export { ProfileDao } from "./daos/profile-dao.js";
export { ProjectDao } from "./daos/project-dao.js";
export { WorkspaceDao } from "./daos/workspace-dao.js";
export { WorkspaceMemberDao } from "./daos/workspace-member-dao.js";
export * from "./mappers/status-mappers.js";
export * from "./types/records.js";
export * from "./types/selects.js";
