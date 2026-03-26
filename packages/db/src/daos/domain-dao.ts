// oxlint-disable eslint/class-methods-use-this
import { desc, eq } from "drizzle-orm";

import { assertRecord } from "../assert-record";
import { db } from "../client";
import type { DomainStatus } from "../schema";
import { domains } from "../schema";
import type { DomainRecord } from "../types/records";
import { domainSelect } from "../types/selects";

export interface DomainCreateInput {
  projectId: string;
  hostname: string;
  pathPrefix?: string | null;
  status?: DomainStatus;
  verifiedAt?: Date | null;
}

export interface DomainUpdateInput {
  hostname?: string;
  pathPrefix?: string | null;
  status?: DomainStatus;
  verifiedAt?: Date | null;
}

export class DomainDao {
  async listByProject(projectId: string): Promise<DomainRecord[]> {
    return await db
      .select(domainSelect)
      .from(domains)
      .where(eq(domains.projectId, projectId))
      .orderBy(desc(domains.createdAt));
  }

  async getById(id: string): Promise<DomainRecord | null> {
    const [record] = await db
      .select(domainSelect)
      .from(domains)
      .where(eq(domains.id, id))
      .limit(1);
    return record ?? null;
  }

  async getByHostname(hostname: string): Promise<DomainRecord | null> {
    const [record] = await db
      .select(domainSelect)
      .from(domains)
      .where(eq(domains.hostname, hostname))
      .limit(1);
    return record ?? null;
  }

  async create(input: DomainCreateInput): Promise<DomainRecord> {
    const [record] = await db
      .insert(domains)
      .values(input)
      .returning(domainSelect);
    return assertRecord(record, "Failed to create domain.");
  }

  async update(id: string, input: DomainUpdateInput): Promise<DomainRecord> {
    const [record] = await db
      .update(domains)
      .set(input)
      .where(eq(domains.id, id))
      .returning(domainSelect);
    return assertRecord(record, "Failed to update domain.");
  }

  async delete(id: string): Promise<DomainRecord> {
    const [record] = await db
      .delete(domains)
      .where(eq(domains.id, id))
      .returning(domainSelect);
    return assertRecord(record, "Failed to delete domain.");
  }
}
