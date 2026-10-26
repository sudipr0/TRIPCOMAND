import type { Prisma } from "@prisma/client";
import type { ListResourcesQuery } from "@trailcomand/shared";

import { prisma } from "../../lib/prisma.js";

export class ResourceRepository {
  /**
   * List resources scoped to workspace.
   * Search by name or code. Filter by type and status.
   */
  static async listResources(
    workspaceId: string,
    filter: ListResourcesQuery,
  ): Promise<{
    total: number;
    items: Prisma.ResourceGetPayload<object>[];
  }> {
    const where: Prisma.ResourceWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: "insensitive" } },
              { code: { contains: filter.search, mode: "insensitive" } },
              { licensePlate: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.resource.count({ where }),
      prisma.resource.findMany({
        where,
        orderBy: { name: "asc" },
        take: filter.limit,
        skip: filter.offset,
      }),
    ]);

    return { total, items };
  }

  static async findById(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.ResourceGetPayload<object> | null> {
    return prisma.resource.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
  }

  static async findByName(
    name: string,
    workspaceId: string,
  ): Promise<Prisma.ResourceGetPayload<object> | null> {
    return prisma.resource.findFirst({
      where: { name, workspaceId, deletedAt: null },
    });
  }

  static async create(
    workspaceId: string,
    data: Omit<Prisma.ResourceUncheckedCreateInput, "workspaceId">,
  ): Promise<Prisma.ResourceGetPayload<object>> {
    return prisma.resource.create({
      data: { ...data, workspaceId },
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.ResourceUncheckedUpdateInput,
  ): Promise<Prisma.ResourceGetPayload<object>> {
    return prisma.resource.update({
      where: { id },
      data,
    });
  }

  static async softDelete(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.ResourceGetPayload<object>> {
    return prisma.resource.update({
      where: { id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });
  }
}
