import type { DomainStatus } from "@prisma/client";
import { prisma } from "../index.js";
import type { DomainRecord } from "../types/records.js";
import { domainSelect } from "../types/selects.js";

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
    return await prisma.domain.findMany({
      where: { projectId },
      select: domainSelect,
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string): Promise<DomainRecord | null> {
    return await prisma.domain.findUnique({
      where: { id },
      select: domainSelect,
    });
  }

  async getByHostname(hostname: string): Promise<DomainRecord | null> {
    return await prisma.domain.findUnique({
      where: { hostname },
      select: domainSelect,
    });
  }

  async create(input: DomainCreateInput): Promise<DomainRecord> {
    return await prisma.domain.create({
      data: input,
      select: domainSelect,
    });
  }

  async update(id: string, input: DomainUpdateInput): Promise<DomainRecord> {
    return await prisma.domain.update({
      where: { id },
      data: input,
      select: domainSelect,
    });
  }

  async delete(id: string): Promise<DomainRecord> {
    return await prisma.domain.delete({
      where: { id },
      select: domainSelect,
    });
  }
}
