import type { Prisma } from "@prisma/client";
import type {
  activitySelect,
  apiKeySelect,
  deploymentSelect,
  domainSelect,
  gitConnectionSelect,
  profileSelect,
  projectSelect,
  workspaceMemberSelect,
  workspaceSelect,
} from "./selects";

export type WorkspaceRecord = Prisma.WorkspaceGetPayload<{
  select: typeof workspaceSelect;
}>;

export type ProjectRecord = Prisma.ProjectGetPayload<{
  select: typeof projectSelect;
}>;

export type DomainRecord = Prisma.DomainGetPayload<{
  select: typeof domainSelect;
}>;

export type DeploymentRecord = Prisma.DeploymentGetPayload<{
  select: typeof deploymentSelect;
}>;

export type ActivityRecord = Prisma.ActivityGetPayload<{
  select: typeof activitySelect;
}>;

export type GitConnectionRecord = Prisma.GitConnectionGetPayload<{
  select: typeof gitConnectionSelect;
}>;

export type ApiKeyRecord = Prisma.ApiKeyGetPayload<{
  select: typeof apiKeySelect;
}>;

export type WorkspaceMemberRecord = Prisma.WorkspaceMemberGetPayload<{
  select: typeof workspaceMemberSelect;
}>;

export type ProfileRecord = Prisma.ProfileGetPayload<{
  select: typeof profileSelect;
}>;
