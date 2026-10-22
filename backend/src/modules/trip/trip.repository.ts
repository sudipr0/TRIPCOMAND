import type { Prisma } from "@prisma/client";
import type { ListTripsQuery } from "@tripchange/shared";

import { prisma } from "../../lib/prisma.js";

type TripInclude = {
  travelers: { orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }] };
  itineraryDays: { orderBy: { dayNumber: "asc" } };
};

export class TripRepository {
  /**
   * List trips scoped to a workspace.
   * Every query filters by workspaceId to enforce tenancy.
   */
  static async listTrips(
    workspaceId: string,
    filter: ListTripsQuery,
  ): Promise<{ total: number; items: Prisma.TripGetPayload<object>[] }> {
    const where: Prisma.TripWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.fromDate || filter.toDate
        ? {
            startDate: {
              ...(filter.fromDate ? { gte: new Date(filter.fromDate) } : {}),
              ...(filter.toDate ? { lte: new Date(filter.toDate) } : {}),
            },
          }
        : {}),
      ...(filter.search
        ? {
            OR: [
              { tripNumber: { contains: filter.search, mode: "insensitive" } },
              { name: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        where,
        orderBy: { startDate: "desc" },
        take: filter.limit,
        skip: filter.offset,
        // The trip list shows traveler counts and readiness, both derived from these relations.
        include: {
          travelers: { orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }] },
          itineraryDays: { orderBy: { dayNumber: "asc" } },
        },
      }),
    ]);
    return { total, items };
  }

  static async findById(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.TripGetPayload<{ include: TripInclude }> | null> {
    return prisma.trip.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        travelers: { orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }] },
        itineraryDays: { orderBy: { dayNumber: "asc" } },
      },
    });
  }

  static async findByBooking(
    bookingId: string,
    workspaceId: string,
  ): Promise<Prisma.TripGetPayload<{ include: TripInclude }> | null> {
    return prisma.trip.findFirst({
      where: { bookingId, workspaceId, deletedAt: null },
      include: {
        travelers: { orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }] },
        itineraryDays: { orderBy: { dayNumber: "asc" } },
      },
    });
  }

  /**
   * Generate the next trip number: TRP-YYYY-NNN.
   * Note: this database stores UUID columns as text, so no ::uuid casts
   * (same fix as Phase 3's quotation/booking repositories).
   */
  static async generateNumber(workspaceId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TRP-${year}-`;
    const rows = await prisma.$queryRaw<{ maxnum: number | null }[]>`
      SELECT MAX(CAST(SUBSTRING(trip_number FROM 'TRP-[0-9]+-([0-9]+)') AS INT)) AS maxnum
      FROM trips
      WHERE workspace_id = ${workspaceId}
        AND trip_number LIKE ${prefix + '%'}
    `;
    const next = (rows[0]?.maxnum ?? 0) + 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  static async create(
    workspaceId: string,
    data: {
      bookingId?: string | null;
      customerId: string;
      tripNumber: string;
      name: string;
      startDate: Date;
      endDate: Date;
      groupSize: number;
      operationsManagerId?: string | null;
      leadGuideId?: string | null;
      notes?: string | null;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<Prisma.TripGetPayload<{ include: TripInclude }>> {
    return prisma.trip.create({
      data: {
        workspaceId,
        bookingId: data.bookingId ?? null,
        customerId: data.customerId,
        tripNumber: data.tripNumber,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        groupSize: data.groupSize,
        operationsManagerId: data.operationsManagerId ?? null,
        leadGuideId: data.leadGuideId ?? null,
        notes: data.notes ?? null,
        metadata: data.metadata ?? {},
      },
      include: {
        travelers: { orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }] },
        itineraryDays: { orderBy: { dayNumber: "asc" } },
      },
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.TripUncheckedUpdateInput,
  ): Promise<Prisma.TripGetPayload<{ include: TripInclude }>> {
    return prisma.trip.update({
      where: { id },
      data,
      include: {
        travelers: { orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }] },
        itineraryDays: { orderBy: { dayNumber: "asc" } },
      },
    });
  }

  static async updateStatus(
    id: string,
    workspaceId: string,
    status: string,
  ): Promise<Prisma.TripGetPayload<{ include: TripInclude }>> {
    return prisma.trip.update({
      where: { id },
      data: { status: status as never },
      include: {
        travelers: { orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }] },
        itineraryDays: { orderBy: { dayNumber: "asc" } },
      },
    });
  }

  static async assign(
    id: string,
    workspaceId: string,
    data: { operationsManagerId?: string | null; leadGuideId?: string | null },
  ): Promise<Prisma.TripGetPayload<{ include: TripInclude }>> {
    const updateData: Prisma.TripUncheckedUpdateInput = {};
    if (data.operationsManagerId !== undefined) {
      updateData.operationsManagerId = data.operationsManagerId;
    }
    if (data.leadGuideId !== undefined) {
      updateData.leadGuideId = data.leadGuideId;
    }
    return prisma.trip.update({
      where: { id },
      data: updateData,
      include: {
        travelers: { orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }] },
        itineraryDays: { orderBy: { dayNumber: "asc" } },
      },
    });
  }

  static async setPublishedVersion(
    id: string,
    workspaceId: string,
    versionId: string,
  ): Promise<Prisma.TripGetPayload<{ include: TripInclude }>> {
    return prisma.trip.update({
      where: { id },
      data: { publishedItineraryVersionId: versionId },
      include: {
        travelers: { orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }] },
        itineraryDays: { orderBy: { dayNumber: "asc" } },
      },
    });
  }

  static async softDelete(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.TripGetPayload<{ include: TripInclude }>> {
    return prisma.trip.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        travelers: { orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }] },
        itineraryDays: { orderBy: { dayNumber: "asc" } },
      },
    });
  }
}
