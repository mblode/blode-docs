import type { DeploymentEnvironment, DeploymentStatus } from "@prisma/client";
import { prisma } from "../index";
import type { DeploymentRecord } from "../types/records";
import { deploymentSelect } from "../types/selects";

export interface DeploymentCreateInput {
  projectId: string;
  environment?: DeploymentEnvironment;
  status?: DeploymentStatus;
  branch: string;
  commitMessage?: string | null;
  changes?: string | null;
  previewUrl?: string | null;
}

export interface DeploymentUpdateInput {
  status?: DeploymentStatus;
  commitMessage?: string | null;
  changes?: string | null;
  previewUrl?: string | null;
}

export class DeploymentDao {
  async listByProject(projectId: string): Promise<DeploymentRecord[]> {
    return await prisma.deployment.findMany({
      where: { projectId },
      select: deploymentSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string): Promise<DeploymentRecord | null> {
    return await prisma.deployment.findUnique({
      where: { id },
      select: deploymentSelect,
    });
  }

  async create(input: DeploymentCreateInput): Promise<DeploymentRecord> {
    return await prisma.deployment.create({
      data: input,
      select: deploymentSelect,
    });
  }

  async update(
    id: string,
    input: DeploymentUpdateInput
  ): Promise<DeploymentRecord> {
    return await prisma.deployment.update({
      where: { id },
      data: input,
      select: deploymentSelect,
    });
  }

  async delete(id: string): Promise<DeploymentRecord> {
    return await prisma.deployment.delete({
      where: { id },
      select: deploymentSelect,
    });
  }
}
