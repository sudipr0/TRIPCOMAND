import type { Prisma } from "@prisma/client";
import type { ListSupplierBookingsQuery } from "@tripchange/shared";

import { prisma } from "../../lib/prisma.js";

const BOOKING_INCLUDE = {
  supplier: {
    select: {
      id: true,
      name: true,
      category: true,
      phone: true,
    },
  },
  itineraryDay: {
    select: {
      id: true,
      dayNumber: true,
      title: true,
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

export class SupplierBookingRepository {
  /**
   * List supplier bookings scoped to workspace.
   * Paginated, with filters for tripId, supplierId, status, category, date range.
   */
  static async listBookings(
    workspaceId: string,
    filter: ListSupplierBookingsQuery,
  ): Promise<{
    total: number;
    items: Prisma.SupplierBookingGetPayload<{ include: typeof BOOKING_INCLUDE }>[];
  }> {
    const where: Prisma.SupplierBookingWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(filter.tripId ? { tripId: filter.tripId } : {}),
      ...(filter.supplierId ? { supplierId: filter.supplierId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.category ? { serviceType: filter.category } : {}),
      ...(filter.fromDate || filter.toDate
        ? {
            AND: [
              ...(filter.fromDate
                ? [{ serviceDate: { gte: new Date(filter.fromDate) } }]
                : []),
              ...(filter.toDate
                ? [{ serviceDate: { lte: new Date(filter.toDate) } }]
                : []),
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.supplierBooking.count({ where }),
      prisma.supplierBooking.findMany({
        where,
        orderBy: { serviceDate: "asc" },
        take: filter.limit,
        skip: filter.offset,
        include: BOOKING_INCLUDE,
      }),
    ]);

    return { total, items };
  }

  static async findById(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.SupplierBookingGetPayload<{ include: typeof BOOKING_INCLUDE }> | null> {
    return prisma.supplierBooking.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: BOOKING_INCLUDE,
    });
  }

  static async findByTrip(
    tripId: string,
    workspaceId: string,
  ): Promise<Prisma.SupplierBookingGetPayload<{ include: typeof BOOKING_INCLUDE }>[]> {
    return prisma.supplierBooking.findMany({
      where: { tripId, workspaceId, deletedAt: null },
      orderBy: { serviceDate: "asc" },
      include: BOOKING_INCLUDE,
    });
  }

  static async findBySupplier(
    supplierId: string,
    workspaceId: string,
  ): Promise<Prisma.SupplierBookingGetPayload<{ include: typeof BOOKING_INCLUDE }>[]> {
    return prisma.supplierBooking.findMany({
      where: { supplierId, workspaceId, deletedAt: null },
      orderBy: { serviceDate: "desc" },
      include: BOOKING_INCLUDE,
    });
  }

  static async findUpcomingCancellationDeadlines(
    workspaceId: string,
    withinHours: number,
  ): Promise<Prisma.SupplierBookingGetPayload<{ include: typeof BOOKING_INCLUDE }>[]> {
    const now = new Date();
    const until = new Date(now.getTime() + withinHours * 60 * 60 * 1000);
    return prisma.supplierBooking.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
        cancellationDeadline: {
          not: null,
          lte: until,
        },
      },
      include: BOOKING_INCLUDE,
      orderBy: { cancellationDeadline: "asc" },
    });
  }

  static async create(
    workspaceId: string,
    data: Omit<Prisma.SupplierBookingUncheckedCreateInput, "workspaceId">,
  ): Promise<Prisma.SupplierBookingGetPayload<{ include: typeof BOOKING_INCLUDE }>> {
    return prisma.supplierBooking.create({
      data: { ...data, workspaceId },
      include: BOOKING_INCLUDE,
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.SupplierBookingUncheckedUpdateInput,
  ): Promise<Prisma.SupplierBookingGetPayload<{ include: typeof BOOKING_INCLUDE }>> {
    return prisma.supplierBooking.update({
      where: { id },
      data,
      include: BOOKING_INCLUDE,
    });
  }

  static async updateStatus(
    id: string,
    workspaceId: string,
    status: Prisma.SupplierBookingUpdateInput["status"],
    extra?: Prisma.SupplierBookingUpdateInput,
  ): Promise<Prisma.SupplierBookingGetPayload<{ include: typeof BOOKING_INCLUDE }>> {
    return prisma.supplierBooking.update({
      where: { id },
      data: { status, ...extra },
      include: BOOKING_INCLUDE,
    });
  }

  static async cancel(
    id: string,
    workspaceId: string,
    userId: string,
    reason: string,
  ): Promise<Prisma.SupplierBookingGetPayload<{ include: typeof BOOKING_INCLUDE }>> {
    return prisma.supplierBooking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: userId,
        cancellationReason: reason,
      },
      include: BOOKING_INCLUDE,
    });
  }

  static async recordActualCost(
    id: string,
    workspaceId: string,
    actualCost: number,
    notes?: string,
  ): Promise<Prisma.SupplierBookingGetPayload<{ include: typeof BOOKING_INCLUDE }>> {
    return prisma.supplierBooking.update({
      where: { id },
      data: {
        actualCost,
        ...(notes !== undefined ? { notes } : {}),
      },
      include: BOOKING_INCLUDE,
    });
  }

  static async softDelete(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.SupplierBookingGetPayload<{ include: typeof BOOKING_INCLUDE }>> {
    return prisma.supplierBooking.update({
      where: { id },
      data: { deletedAt: new Date(), status: "CANCELLED" },
      include: BOOKING_INCLUDE,
    });
  }

  static async countActiveBySupplier(
    supplierId: string,
    workspaceId: string,
  ): Promise<number> {
    return prisma.supplierBooking.count({
      where: {
        workspaceId,
        supplierId,
        deletedAt: null,
        status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
      },
    });
  }
}
