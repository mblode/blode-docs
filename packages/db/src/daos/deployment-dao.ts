// oxlint-disable eslint/class-methods-use-this
import { and, desc, eq, isNotNull } from "drizzle-orm";

import { assertRecord } from "../assert-record";
import { db } from "../client";
import { deployments } from "../schema";
import type { DeploymentEnvironment, DeploymentStatus } from "../schema";
import type { DeploymentRecord } from "../types/records";
import { deploymentSelect } from "../types/selects";

export interface DeploymentCreateInput {
  projectId: string;
  environment?: DeploymentEnvironment;
  status?: DeploymentStatus;
  branch: string;
  commitMessage?: string | null;
  changes?: string | null;
  fileCount?: number | null;
  manifestUrl?: string | null;
  previewUrl?: string | null;
  promotedAt?: Date | null;
}

export interface DeploymentUpdateInput {
  status?: DeploymentStatus;
  commitMessage?: string | null;
  changes?: string | null;
  fileCount?: number | null;
  manifestUrl?: string | null;
  previewUrl?: string | null;
  promotedAt?: Date | null;
}

export class DeploymentDao {
  async listByProject(projectId: string): Promise<DeploymentRecord[]> {
    return await db
      .select(deploymentSelect)
      .from(deployments)
      .where(eq(deployments.projectId, projectId))
      .orderBy(desc(deployments.createdAt));
  }

  async getById(id: string): Promise<DeploymentRecord | null> {
    const [record] = await db
      .select(deploymentSelect)
      .from(deployments)
      .where(eq(deployments.id, id))
      .limit(1);
    return record ?? null;
  }

  async getByProjectId(
    projectId: string,
    id: string
  ): Promise<DeploymentRecord | null> {
    const [record] = await db
      .select(deploymentSelect)
      .from(deployments)
      .where(and(eq(deployments.id, id), eq(deployments.projectId, projectId)))
      .limit(1);
    return record ?? null;
  }

  async getLatestPromotedByProject(
    projectId: string
  ): Promise<DeploymentRecord | null> {
    const [record] = await db
      .select(deploymentSelect)
      .from(deployments)
      .where(
        and(
          eq(deployments.environment, "production"),
          eq(deployments.projectId, projectId),
          eq(deployments.status, "successful"),
          isNotNull(deployments.promotedAt)
        )
      )
      .orderBy(desc(deployments.promotedAt), desc(deployments.createdAt))
      .limit(1);
    return record ?? null;
  }

  async create(input: DeploymentCreateInput): Promise<DeploymentRecord> {
    const [record] = await db
      .insert(deployments)
      .values(input)
      .returning(deploymentSelect);
    return assertRecord(record, "Failed to create deployment.");
  }

  async update(
    id: string,
    input: DeploymentUpdateInput
  ): Promise<DeploymentRecord> {
    const [record] = await db
      .update(deployments)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(deployments.id, id))
      .returning(deploymentSelect);
    return assertRecord(record, "Failed to update deployment.");
  }

  async delete(id: string): Promise<DeploymentRecord> {
    const [record] = await db
      .delete(deployments)
      .where(eq(deployments.id, id))
      .returning(deploymentSelect);
    return assertRecord(record, "Failed to delete deployment.");
  }
}
