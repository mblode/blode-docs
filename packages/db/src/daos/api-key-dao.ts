import { prisma } from "../index";
import type { ApiKeyRecord } from "../types/records";
import { apiKeySelect } from "../types/selects";

export interface ApiKeyCreateInput {
  workspaceId: string;
  name: string;
  prefix: string;
}

export interface ApiKeyUpdateInput {
  name?: string;
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
}

export class ApiKeyDao {
  async listByWorkspace(workspaceId: string): Promise<ApiKeyRecord[]> {
    return await prisma.apiKey.findMany({
      where: { workspaceId },
      select: apiKeySelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string): Promise<ApiKeyRecord | null> {
    return await prisma.apiKey.findUnique({
      where: { id },
      select: apiKeySelect,
    });
  }

  async create(input: ApiKeyCreateInput): Promise<ApiKeyRecord> {
    return await prisma.apiKey.create({
      data: input,
      select: apiKeySelect,
    });
  }

  async update(id: string, input: ApiKeyUpdateInput): Promise<ApiKeyRecord> {
    return await prisma.apiKey.update({
      where: { id },
      data: input,
      select: apiKeySelect,
    });
  }

  async delete(id: string): Promise<ApiKeyRecord> {
    return await prisma.apiKey.delete({
      where: { id },
      select: apiKeySelect,
    });
  }
}
