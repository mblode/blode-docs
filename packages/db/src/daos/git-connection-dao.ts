// oxlint-disable eslint/class-methods-use-this
import { eq } from "drizzle-orm";

import { assertRecord } from "../assert-record.js";
import { db } from "../client.js";
import { gitConnections } from "../schema.js";
import type { GitConnectionRecord } from "../types/records.js";
import { gitConnectionSelect } from "../types/selects.js";

export interface GitConnectionUpsertInput {
  accountLogin: string;
  branch?: string;
  docsPath?: string;
  installationId: number;
  projectId: string;
  repository: string;
}

export interface GitConnectionUpdateInput {
  branch?: string;
  docsPath?: string;
  repository?: string;
  accountLogin?: string;
  installationId?: number;
}

export class GitConnectionDao {
  async getByProject(projectId: string): Promise<GitConnectionRecord | null> {
    const [record] = await db
      .select(gitConnectionSelect)
      .from(gitConnections)
      .where(eq(gitConnections.projectId, projectId))
      .limit(1);
    return record ?? null;
  }

  async listByInstallation(
    installationId: number
  ): Promise<GitConnectionRecord[]> {
    return await db
      .select(gitConnectionSelect)
      .from(gitConnections)
      .where(eq(gitConnections.installationId, installationId));
  }

  async upsert(input: GitConnectionUpsertInput): Promise<GitConnectionRecord> {
    const existing = await this.getByProject(input.projectId);
    if (existing) {
      return await this.update(existing.id, {
        accountLogin: input.accountLogin,
        branch: input.branch ?? existing.branch,
        docsPath: input.docsPath ?? existing.docsPath,
        installationId: input.installationId,
        repository: input.repository,
      });
    }

    const [record] = await db
      .insert(gitConnections)
      .values({
        accountLogin: input.accountLogin,
        branch: input.branch,
        docsPath: input.docsPath,
        installationId: input.installationId,
        projectId: input.projectId,
        repository: input.repository,
      })
      .returning(gitConnectionSelect);
    return assertRecord(record, "Failed to create git connection.");
  }

  async update(
    id: string,
    input: GitConnectionUpdateInput
  ): Promise<GitConnectionRecord> {
    const [record] = await db
      .update(gitConnections)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(gitConnections.id, id))
      .returning(gitConnectionSelect);
    return assertRecord(record, "Failed to update git connection.");
  }

  async delete(id: string): Promise<GitConnectionRecord> {
    const [record] = await db
      .delete(gitConnections)
      .where(eq(gitConnections.id, id))
      .returning(gitConnectionSelect);
    return assertRecord(record, "Failed to delete git connection.");
  }
}
