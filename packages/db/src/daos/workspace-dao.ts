import { prisma } from "../index.js";
import type { WorkspaceRecord } from "../types/records.js";
import { workspaceSelect } from "../types/selects.js";

export interface WorkspaceCreateInput {
  slug: string;
  name: string;
}

export interface WorkspaceUpdateInput {
  name?: string;
}

export class WorkspaceDao {
  async list(): Promise<WorkspaceRecord[]> {
    return await prisma.workspace.findMany({
      select: workspaceSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string): Promise<WorkspaceRecord | null> {
    return await prisma.workspace.findUnique({
      where: { id },
      select: workspaceSelect,
    });
  }

  async getBySlug(slug: string): Promise<WorkspaceRecord | null> {
    return await prisma.workspace.findUnique({
      where: { slug },
      select: workspaceSelect,
    });
  }

  async create(input: WorkspaceCreateInput): Promise<WorkspaceRecord> {
    return await prisma.workspace.create({
      data: input,
      select: workspaceSelect,
    });
  }

  async update(
    id: string,
    input: WorkspaceUpdateInput
  ): Promise<WorkspaceRecord> {
    return await prisma.workspace.update({
      where: { id },
      data: input,
      select: workspaceSelect,
    });
  }

  async delete(id: string): Promise<WorkspaceRecord> {
    return await prisma.workspace.delete({
      where: { id },
      select: workspaceSelect,
    });
  }
}
