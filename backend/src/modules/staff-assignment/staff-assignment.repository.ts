import type { Prisma } from "@prisma/client";
import type { ListStaffAssignmentsQuery } from "@trailcomand/shared";

import { prisma } from "../../lib/prisma.js";

const STAFF_INCLUDE = {
  staff: {
    select: {
      id: true,
      fullName: true,
      staffType: true,
      phone: true,
    },
  },
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

export class StaffAssignmentRepository {
  /**
   * List staff assignments scoped to workspace.
   * Paginated, with filters for tripId, staffId, status, and date range overlap.
   */
  static async listAssignments(
    workspaceId: string,
    filter: ListStaffAssignmentsQuery,
  ): Promise<{
    total: number;
    items: Prisma.StaffAssignmentGetPayload<{ include: typeof STAFF_INCLUDE }>[];
  }> {
    const where: Prisma.StaffAssignmentWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(filter.tripId ? { tripId: filter.tripId } : {}),
      ...(filter.staffId ? { staffId: filter.staffId } : {}),
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
      prisma.staffAssignment.count({ where }),
      prisma.staffAssignment.findMany({
        where,
        orderBy: { startDate: "asc" },
        take: filter.limit,
        skip: filter.offset,
        include: STAFF_INCLUDE,
      }),
    ]);

    return { total, items };
  }

  static async findById(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.StaffAssignmentGetPayload<{ include: typeof STAFF_INCLUDE }> | null> {
    return prisma.staffAssignment.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: STAFF_INCLUDE,
    });
  }

  /**
   * Conflict detection: finds active assignments for the staff member
   * overlapping [startDate, endDate].
   * Overlap definition: NOT (existing.endDate <= startDate OR existing.startDate >= endDate).
   * Note: back-to-back assignments (existing.endDate == startDate) do NOT conflict.
   */
  static async findOverlapping(
    staffId: string,
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<Prisma.StaffAssignmentGetPayload<{ include: typeof STAFF_INCLUDE }>[]> {
    return prisma.staffAssignment.findMany({
      where: {
        workspaceId,
        staffId,
        deletedAt: null,
        status: { notIn: ["CANCELLED", "DECLINED"] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        // Overlap condition:
        // existing.startDate < requested.endDate AND existing.endDate > requested.startDate
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      include: STAFF_INCLUDE,
      orderBy: { startDate: "asc" },
    });
  }

  static async create(
    workspaceId: string,
    data: Omit<Prisma.StaffAssignmentUncheckedCreateInput, "workspaceId">,
  ): Promise<Prisma.StaffAssignmentGetPayload<{ include: typeof STAFF_INCLUDE }>> {
    return prisma.staffAssignment.create({
      data: { ...data, workspaceId },
      include: STAFF_INCLUDE,
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.StaffAssignmentUncheckedUpdateInput,
  ): Promise<Prisma.StaffAssignmentGetPayload<{ include: typeof STAFF_INCLUDE }>> {
    return prisma.staffAssignment.update({
      where: { id },
      data,
      include: STAFF_INCLUDE,
    });
  }

  static async updateStatus(
    id: string,
    workspaceId: string,
    status: Prisma.StaffAssignmentUpdateInput["status"],
    extra?: Prisma.StaffAssignmentUpdateInput,
  ): Promise<Prisma.StaffAssignmentGetPayload<{ include: typeof STAFF_INCLUDE }>> {
    return prisma.staffAssignment.update({
      where: { id },
      data: { status, ...extra },
      include: STAFF_INCLUDE,
    });
  }

  static async softDelete(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.StaffAssignmentGetPayload<{ include: typeof STAFF_INCLUDE }>> {
    return prisma.staffAssignment.update({
      where: { id },
      data: { deletedAt: new Date(), status: "CANCELLED" },
      include: STAFF_INCLUDE,
    });
  }

  static async listByTrip(
    tripId: string,
    workspaceId: string,
  ): Promise<Prisma.StaffAssignmentGetPayload<{ include: typeof STAFF_INCLUDE }>[]> {
    return prisma.staffAssignment.findMany({
      where: { tripId, workspaceId, deletedAt: null },
      orderBy: { startDate: "asc" },
      include: STAFF_INCLUDE,
    });
  }

  static async listByStaff(
    staffId: string,
    workspaceId: string,
  ): Promise<Prisma.StaffAssignmentGetPayload<{ include: typeof STAFF_INCLUDE }>[]> {
    return prisma.staffAssignment.findMany({
      where: { staffId, workspaceId, deletedAt: null },
      orderBy: { startDate: "desc" },
      include: STAFF_INCLUDE,
    });
  }
}
