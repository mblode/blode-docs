// oxlint-disable eslint/class-methods-use-this
import { and, eq, notInArray, sql } from "drizzle-orm";

import { db } from "../client.js";
import { githubInstallations } from "../schema.js";
import type { GithubInstallationRecord } from "../types/records.js";
import { githubInstallationSelect } from "../types/selects.js";

export interface GithubInstallationInput {
  accountLogin: string;
  accountType: string;
  installationId: number;
}

const sqlExcluded = (column: string) => sql.raw(`excluded.${column}`);

export class GithubInstallationDao {
  async listByUserId(userId: string): Promise<GithubInstallationRecord[]> {
    return await db
      .select(githubInstallationSelect)
      .from(githubInstallations)
      .where(eq(githubInstallations.userId, userId));
  }

  async replaceForUser(
    userId: string,
    inputs: GithubInstallationInput[]
  ): Promise<void> {
    const keep = inputs.map((input) => input.installationId);
    await db.transaction(async (tx) => {
      const whereClause =
        keep.length > 0
          ? and(
              eq(githubInstallations.userId, userId),
              notInArray(githubInstallations.installationId, keep)
            )
          : eq(githubInstallations.userId, userId);
      await tx.delete(githubInstallations).where(whereClause);
      if (inputs.length === 0) {
        return;
      }
      const now = new Date();
      await tx
        .insert(githubInstallations)
        .values(
          inputs.map((input) => ({
            accountLogin: input.accountLogin,
            accountType: input.accountType,
            installationId: input.installationId,
            updatedAt: now,
            userId,
          }))
        )
        .onConflictDoUpdate({
          set: {
            accountLogin: sqlExcluded("account_login"),
            accountType: sqlExcluded("account_type"),
            updatedAt: now,
          },
          target: [
            githubInstallations.userId,
            githubInstallations.installationId,
          ],
        });
    });
  }

  async deleteByInstallationId(installationId: number): Promise<void> {
    await db
      .delete(githubInstallations)
      .where(eq(githubInstallations.installationId, installationId));
  }
}
