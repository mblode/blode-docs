import type { MemberRole, MemberStatus } from "@prisma/client";
import { prisma } from "../index";
import type { WorkspaceMemberRecord } from "../types/records";
import { workspaceMemberSelect } from "../types/selects";

export interface WorkspaceMemberCreateInput {
  workspaceId: string;
  email: string;
  role?: MemberRole;
  status?: MemberStatus;
  joinedAt?: Date | null;
}

export interface WorkspaceMemberUpdateInput {
  role?: MemberRole;
  status?: MemberStatus;
  joinedAt?: Date | null;
}

export class WorkspaceMemberDao {
  async listByWorkspace(workspaceId: string): Promise<WorkspaceMemberRecord[]> {
    return await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: workspaceMemberSelect,
      orderBy: { joinedAt: "desc" },
    });
  }

  async getByWorkspaceEmail(
    workspaceId: string,
    email: string
  ): Promise<WorkspaceMemberRecord | null> {
    return await prisma.workspaceMember.findFirst({
      where: { workspaceId, email },
      select: workspaceMemberSelect,
    });
  }

  async create(
    input: WorkspaceMemberCreateInput
  ): Promise<WorkspaceMemberRecord> {
    return await prisma.workspaceMember.create({
      data: input,
      select: workspaceMemberSelect,
    });
  }

  async update(
    id: string,
    input: WorkspaceMemberUpdateInput
  ): Promise<WorkspaceMemberRecord> {
    return await prisma.workspaceMember.update({
      where: { id },
      data: input,
      select: workspaceMemberSelect,
    });
  }

  async delete(id: string): Promise<WorkspaceMemberRecord> {
    return await prisma.workspaceMember.delete({
      where: { id },
      select: workspaceMemberSelect,
    });
  }
}
