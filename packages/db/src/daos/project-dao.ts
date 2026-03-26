// oxlint-disable eslint/class-methods-use-this
import { desc, eq } from "drizzle-orm";

import { assertRecord } from "../assert-record";
import { db } from "../client";
import { projects } from "../schema";
import type { ProjectRecord } from "../types/records";
import { projectSelect } from "../types/selects";

export interface ProjectCreateInput {
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
    return await db
      .select(projectSelect)
      .from(projects)
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
