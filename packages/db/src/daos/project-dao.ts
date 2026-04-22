// oxlint-disable eslint/class-methods-use-this
import type { ProjectAnalytics } from "@repo/contracts";
import { and, desc, eq } from "drizzle-orm";

import { assertRecord } from "../assert-record.js";
import { db } from "../client.js";
import { projects, users } from "../schema.js";
import type { ProjectRecord, UserRecord } from "../types/records.js";
import { projectSelect, userSelect } from "../types/selects.js";

export interface ProjectCreateInput {
  slug: string;
  name: string;
  deploymentName: string;
  description?: string | null;
  userId?: string | null;
}

export interface ProjectUpdateInput {
  analytics?: ProjectAnalytics | null;
  name?: string;
  deploymentName?: string;
  description?: string | null;
  userId?: string | null;
}

export class ProjectDao {
  async list(): Promise<ProjectRecord[]> {
    return await db
      .select(projectSelect)
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  async listByUser(userId: string): Promise<ProjectRecord[]> {
    return await db
      .select(projectSelect)
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getById(id: string): Promise<ProjectRecord | null> {
    const [record] = await db
      .select(projectSelect)
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return record ?? null;
  }

  async getBySlugUnique(slug: string): Promise<ProjectRecord | null> {
    const [record] = await db
      .select(projectSelect)
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);
    return record ?? null;
  }

  async getAuthorizedBySlug(
    authId: string,
    slug: string
  ): Promise<{ project: ProjectRecord; user: UserRecord } | null> {
    const [record] = await db
      .select({ project: projectSelect, user: userSelect })
      .from(projects)
      .innerJoin(users, eq(users.id, projects.userId))
      .where(and(eq(users.authId, authId), eq(projects.slug, slug)))
      .limit(1);
    return record ?? null;
  }

  async create(input: ProjectCreateInput): Promise<ProjectRecord> {
    const [record] = await db
      .insert(projects)
      .values(input)
      .returning(projectSelect);
    return assertRecord(record, "Failed to create project.");
  }

  async update(id: string, input: ProjectUpdateInput): Promise<ProjectRecord> {
    const [record] = await db
      .update(projects)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning(projectSelect);
    return assertRecord(record, "Failed to update project.");
  }

  async delete(id: string): Promise<ProjectRecord> {
    const [record] = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning(projectSelect);
    return assertRecord(record, "Failed to delete project.");
  }
}
