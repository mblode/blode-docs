import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { Prisma } from "@prisma/client";
// biome-ignore lint/performance/noBarrelFile: This is the main entry point for the package
export { ActivityDao } from "./daos/activity-dao";
export { ApiKeyDao } from "./daos/api-key-dao";
export { DeploymentDao } from "./daos/deployment-dao";
export { DomainDao } from "./daos/domain-dao";
export { GitConnectionDao } from "./daos/git-connection-dao";
export { ProfileDao } from "./daos/profile-dao";
export { ProjectDao } from "./daos/project-dao";
export { WorkspaceDao } from "./daos/workspace-dao";
export { WorkspaceMemberDao } from "./daos/workspace-member-dao";
export * from "./mappers/status-mappers";
export * from "./types/records";
export * from "./types/selects";
