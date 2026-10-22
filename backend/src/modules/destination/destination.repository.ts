import type { Prisma } from "@prisma/client";

import { rawPrisma } from "../../lib/prisma.js";
import type { ListDestinationsQuery } from "./destination.schemas.js";

export class DestinationRepository {
  /**
   * List destinations scoped to a workspace.
   * Every query filters by workspaceId to enforce tenancy.
   */
  static async listDestinations(
    workspaceId: string,
    filter: ListDestinationsQuery,
  ): Promise<{ total: number; items: Prisma.DestinationGetPayload<object>[] }> {
    const where: Prisma.DestinationWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(filter.region ? { region: filter.region } : {}),
      ...(filter.search
        ? { name: { contains: filter.search, mode: "insensitive" } }
        : {}),
    };

    const [total, items] = await Promise.all([
      rawPrisma.destination.count({ where }),
      rawPrisma.destination.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filter.limit,
        skip: filter.offset,
      }),
    ]);

    return { total, items };
  }

  static async findById(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.DestinationGetPayload<object> | null> {
    return rawPrisma.destination.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
  }

  static async findByName(
    name: string,
    workspaceId: string,
  ): Promise<Prisma.DestinationGetPayload<object> | null> {
    return rawPrisma.destination.findFirst({
      where: { name, workspaceId, deletedAt: null },
    });
  }

  static async create(
    workspaceId: string,
    data: {
      name: string;
      region?: string | null;
      country: string;
      latitude?: number | null;
      longitude?: number | null;
      altitude?: number | null;
      description?: string | null;
      imageUrl?: string | null;
    },
  ): Promise<Prisma.DestinationGetPayload<object>> {
    return rawPrisma.destination.create({
      data: {
        workspaceId,
        name: data.name,
        region: data.region ?? null,
        country: data.country,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        altitude: data.altitude ?? null,
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
      },
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.DestinationUpdateInput,
  ): Promise<Prisma.DestinationGetPayload<object>> {
    // Guard tenancy by asserting existence within workspace first.
    const existing = await rawPrisma.destination.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error("Destination not found in workspace");
    }

    return rawPrisma.destination.update({
      where: { id },
      data,
    });
  }

  static async softDelete(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.DestinationGetPayload<object>> {
    const existing = await rawPrisma.destination.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error("Destination not found in workspace");
    }

    return rawPrisma.destination.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
