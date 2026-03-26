// oxlint-disable eslint/class-methods-use-this
import { desc, eq } from "drizzle-orm";

import { assertRecord } from "../assert-record";
import { db } from "../client";
import { apiKeys } from "../schema";
import type { ApiKeyAuthRecord, ApiKeyRecord } from "../types/records";
import { apiKeyAuthSelect, apiKeySelect } from "../types/selects";

export interface ApiKeyCreateInput {
  projectId: string;
  name: string;
  prefix: string;
  tokenHash?: string | null;
}

export interface ApiKeyUpdateInput {
  name?: string;
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
  tokenHash?: string | null;
}

export class ApiKeyDao {
  async listByProject(projectId: string): Promise<ApiKeyRecord[]> {
    return await db
      .select(apiKeySelect)
      .from(apiKeys)
      .where(eq(apiKeys.projectId, projectId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async getById(id: string): Promise<ApiKeyRecord | null> {
    const [record] = await db
      .select(apiKeySelect)
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);
    return record ?? null;
  }

  async getByPrefix(prefix: string): Promise<ApiKeyAuthRecord | null> {
    const [record] = await db
      .select(apiKeyAuthSelect)
      .from(apiKeys)
      .where(eq(apiKeys.prefix, prefix))
      .limit(1);
    return record ?? null;
  }

  async create(input: ApiKeyCreateInput): Promise<ApiKeyRecord> {
    const [record] = await db
      .insert(apiKeys)
      .values(input)
      .returning(apiKeySelect);
    return assertRecord(record, "Failed to create API key.");
  }

  async update(id: string, input: ApiKeyUpdateInput): Promise<ApiKeyRecord> {
    const [record] = await db
      .update(apiKeys)
      .set(input)
      .where(eq(apiKeys.id, id))
      .returning(apiKeySelect);
    return assertRecord(record, "Failed to update API key.");
  }

  async delete(id: string): Promise<ApiKeyRecord> {
    const [record] = await db
      .delete(apiKeys)
      .where(eq(apiKeys.id, id))
      .returning(apiKeySelect);
    return assertRecord(record, "Failed to delete API key.");
  }
}
