// oxlint-disable eslint/class-methods-use-this
import { and, desc, eq, isNotNull } from "drizzle-orm";

import { assertRecord } from "../assert-record.js";
import { db } from "../client.js";
import { deployments } from "../schema.js";
import type { DeploymentEnvironment, DeploymentStatus } from "../schema.js";
import type { DeploymentRecord } from "../types/records.js";
import { deploymentSelect } from "../types/selects.js";

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
  async listByProject(
    projectId: string,
    options?: { limit?: number }
  ): Promise<DeploymentRecord[]> {
    const query = db
      .select(deploymentSelect)
      .from(deployments)
      .where(eq(deployments.projectId, projectId))
      .orderBy(desc(deployments.createdAt));
    if (options?.limit) {
      return await query.limit(options.limit);
    }
    return await query;
  }

  async getLatestByProject(
    projectId: string
  ): Promise<DeploymentRecord | null> {
    const [record] = await db
      .select(deploymentSelect)
      .from(deployments)
      .where(eq(deployments.projectId, projectId))
      .orderBy(desc(deployments.createdAt))
      .limit(1);
    return record ?? null;
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
