import { prisma } from "../index.js";
import type { ProfileRecord } from "../types/records.js";
import { profileSelect } from "../types/selects.js";

export interface ProfileUpsertInput {
  id: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface ProfileUpdateInput {
  email?: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export class ProfileDao {
  async getById(id: string): Promise<ProfileRecord | null> {
    return await prisma.profile.findUnique({
      where: { id },
      select: profileSelect,
    });
  }

  async upsert(input: ProfileUpsertInput): Promise<ProfileRecord> {
    return await prisma.profile.upsert({
      where: { id: input.id },
      update: {
        email: input.email,
        fullName: input.fullName ?? null,
        avatarUrl: input.avatarUrl ?? null,
      },
      create: {
        id: input.id,
        email: input.email,
        fullName: input.fullName ?? null,
        avatarUrl: input.avatarUrl ?? null,
      },
      select: profileSelect,
    });
  }

  async update(id: string, input: ProfileUpdateInput): Promise<ProfileRecord> {
    return await prisma.profile.update({
      where: { id },
      data: input,
      select: profileSelect,
    });
  }

  async delete(id: string): Promise<ProfileRecord> {
    return await prisma.profile.delete({
      where: { id },
      select: profileSelect,
    });
  }
}
