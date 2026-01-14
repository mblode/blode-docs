import type { GitProvider } from "@prisma/client";
import { prisma } from "../index";
import type { GitConnectionRecord } from "../types/records";
import { gitConnectionSelect } from "../types/selects";

export interface GitConnectionCreateInput {
  projectId: string;
  provider?: GitProvider;
  organization: string;
  repository: string;
  branch: string;
  isMonorepo?: boolean;
  docsPath?: string | null;
  appInstalled?: boolean;
}

export interface GitConnectionUpdateInput {
  organization?: string;
  repository?: string;
  branch?: string;
  isMonorepo?: boolean;
  docsPath?: string | null;
  appInstalled?: boolean;
}

export class GitConnectionDao {
  async getByProject(projectId: string): Promise<GitConnectionRecord | null> {
    return await prisma.gitConnection.findFirst({
      where: { projectId },
      select: gitConnectionSelect,
    });
  }

  async create(input: GitConnectionCreateInput): Promise<GitConnectionRecord> {
    return await prisma.gitConnection.create({
      data: input,
      select: gitConnectionSelect,
    });
  }

  async update(
    id: string,
    input: GitConnectionUpdateInput
  ): Promise<GitConnectionRecord> {
    return await prisma.gitConnection.update({
      where: { id },
      data: input,
      select: gitConnectionSelect,
    });
  }

  async delete(id: string): Promise<GitConnectionRecord> {
    return await prisma.gitConnection.delete({
      where: { id },
      select: gitConnectionSelect,
    });
  }
}
