import { prisma } from "../index";
import type { ProjectRecord } from "../types/records";
import { projectSelect } from "../types/selects";

export interface ProjectCreateInput {
  workspaceId: string;
  slug: string;
  name: string;
  deploymentName: string;
  description?: string | null;
}

export interface ProjectUpdateInput {
  name?: string;
  deploymentName?: string;
  description?: string | null;
}

export class ProjectDao {
  async list(): Promise<ProjectRecord[]> {
    return await prisma.project.findMany({
      select: projectSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async listByWorkspace(workspaceId: string): Promise<ProjectRecord[]> {
    return await prisma.project.findMany({
      where: { workspaceId },
      select: projectSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string): Promise<ProjectRecord | null> {
    return await prisma.project.findUnique({
      where: { id },
      select: projectSelect,
    });
  }

  async getBySlugUnique(slug: string): Promise<ProjectRecord | null> {
    return await prisma.project.findUnique({
      where: { slug },
      select: projectSelect,
    });
  }

  async getBySlug(
    workspaceId: string,
    slug: string
  ): Promise<ProjectRecord | null> {
    return await prisma.project.findFirst({
      where: { workspaceId, slug },
      select: projectSelect,
    });
  }

  async create(input: ProjectCreateInput): Promise<ProjectRecord> {
    return await prisma.project.create({
      data: input,
      select: projectSelect,
    });
  }

  async update(id: string, input: ProjectUpdateInput): Promise<ProjectRecord> {
    return await prisma.project.update({
      where: { id },
      data: input,
      select: projectSelect,
    });
  }

  async delete(id: string): Promise<ProjectRecord> {
    return await prisma.project.delete({
      where: { id },
      select: projectSelect,
    });
  }
}
