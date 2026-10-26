import type { Prisma } from "@prisma/client";
import type { ListResourceAssignmentsQuery } from "@trailcomand/shared";

import { prisma } from "../../lib/prisma.js";

const RESOURCE_INCLUDE = {
  resource: true,
  trip: {
    select: {
      id: true,
      tripNumber: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  },
} as const;

export class ResourceAssignmentRepository {
  /**
   * List resource assignments scoped to workspace.
   * Paginated, with filters for tripId, resourceId, status, and date overlap.
   */
  static async listAssignments(
    workspaceId: string,
    filter: ListResourceAssignmentsQuery,
  ): Promise<{
    total: number;
    items: Prisma.ResourceAssignmentGetPayload<{ include: typeof RESOURCE_INCLUDE }>[];
  }> {
    const where: Prisma.ResourceAssignmentWhereInput = {
      workspaceId,
      ...(filter.tripId ? { tripId: filter.tripId } : {}),
      ...(filter.resourceId ? { resourceId: filter.resourceId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.fromDate || filter.toDate
        ? {
            AND: [
              ...(filter.fromDate ? [{ endDate: { gte: new Date(filter.fromDate) } }] : []),
              ...(filter.toDate ? [{ startDate: { lte: new Date(filter.toDate) } }] : []),
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.resourceAssignment.count({ where }),
      prisma.resourceAssignment.findMany({
        where,
        orderBy: { startDate: "asc" },
        take: filter.limit,
        skip: filter.offset,
        include: RESOURCE_INCLUDE,
      }),
    ]);

    return { total, items };
  }

  static async findById(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.ResourceAssignmentGetPayload<{ include: typeof RESOURCE_INCLUDE }> | null> {
    return prisma.resourceAssignment.findFirst({
      where: { id, workspaceId },
      include: RESOURCE_INCLUDE,
    });
  }

  /**
   * Conflict detection: finds active assignments for the resource
   * overlapping [startDate, endDate].
   * Overlap condition: startDate < requestedEndDate AND endDate > requestedStartDate.
   * Excludes CANCELLED.
   */
  static async findOverlapping(
    resourceId: string,
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<Prisma.ResourceAssignmentGetPayload<{ include: typeof RESOURCE_INCLUDE }>[]> {
    return prisma.resourceAssignment.findMany({
      where: {
        workspaceId,
        resourceId,
        status: { notIn: ["CANCELLED"] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      include: RESOURCE_INCLUDE,
      orderBy: { startDate: "asc" },
    });
  }

  static async create(
    workspaceId: string,
    data: Omit<Prisma.ResourceAssignmentUncheckedCreateInput, "workspaceId">,
  ): Promise<Prisma.ResourceAssignmentGetPayload<{ include: typeof RESOURCE_INCLUDE }>> {
    return prisma.resourceAssignment.create({
      data: { ...data, workspaceId },
      include: RESOURCE_INCLUDE,
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.ResourceAssignmentUncheckedUpdateInput,
  ): Promise<Prisma.ResourceAssignmentGetPayload<{ include: typeof RESOURCE_INCLUDE }>> {
    return prisma.resourceAssignment.update({
      where: { id },
      data,
      include: RESOURCE_INCLUDE,
    });
  }

  static async updateStatus(
    id: string,
    workspaceId: string,
    status: Prisma.ResourceAssignmentUpdateInput["status"],
  ): Promise<Prisma.ResourceAssignmentGetPayload<{ include: typeof RESOURCE_INCLUDE }>> {
    return prisma.resourceAssignment.update({
      where: { id },
      data: { status },
      include: RESOURCE_INCLUDE,
    });
  }

  static async delete(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.ResourceAssignmentGetPayload<{ include: typeof RESOURCE_INCLUDE }>> {
    return prisma.resourceAssignment.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: RESOURCE_INCLUDE,
    });
  }

  static async listByTrip(
    tripId: string,
    workspaceId: string,
  ): Promise<Prisma.ResourceAssignmentGetPayload<{ include: typeof RESOURCE_INCLUDE }>[]> {
    return prisma.resourceAssignment.findMany({
      where: { tripId, workspaceId },
      orderBy: { startDate: "asc" },
      include: RESOURCE_INCLUDE,
    });
  }

  static async listByResource(
    resourceId: string,
    workspaceId: string,
  ): Promise<Prisma.ResourceAssignmentGetPayload<{ include: typeof RESOURCE_INCLUDE }>[]> {
    return prisma.resourceAssignment.findMany({
      where: { resourceId, workspaceId },
      orderBy: { startDate: "desc" },
      include: RESOURCE_INCLUDE,
    });
  }
}
