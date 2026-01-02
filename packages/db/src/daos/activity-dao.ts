import type { ActivityStatus } from "@prisma/client";
import { prisma } from "../index";
import type { ActivityRecord } from "../types/records";
import { activitySelect } from "../types/selects";

export interface ActivityCreateInput {
  projectId: string;
  summary: string;
  status?: ActivityStatus;
  changes?: string | null;
  actorName: string;
  actorAvatarUrl?: string | null;
  occurredAt?: Date;
}

export class ActivityDao {
  async listByProject(projectId: string): Promise<ActivityRecord[]> {
    return await prisma.activity.findMany({
      where: { projectId },
      select: activitySelect,
      orderBy: { occurredAt: "desc" },
    });
  }

  async create(input: ActivityCreateInput): Promise<ActivityRecord> {
    return await prisma.activity.create({
      data: input,
      select: activitySelect,
    });
  }

  async delete(id: string): Promise<ActivityRecord> {
    return await prisma.activity.delete({
      where: { id },
      select: activitySelect,
    });
  }
}
