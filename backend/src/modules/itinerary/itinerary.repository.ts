import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export class ItineraryRepository {
  /** All days for a trip, ordered by dayNumber. Every query filters by workspaceId. */
  static async listDays(
    tripId: string,
    workspaceId: string,
  ): Promise<Prisma.ItineraryDayGetPayload<object>[]> {
    return prisma.itineraryDay.findMany({
      where: { tripId, workspaceId },
      orderBy: { dayNumber: "asc" },
    });
  }

  static async findDayById(
    dayId: string,
    workspaceId: string,
  ): Promise<Prisma.ItineraryDayGetPayload<object> | null> {
    return prisma.itineraryDay.findFirst({
      where: { id: dayId, workspaceId },
    });
  }

  static async createDay(
    workspaceId: string,
    tripId: string,
    data: Prisma.ItineraryDayUncheckedCreateInput,
  ): Promise<Prisma.ItineraryDayGetPayload<object>> {
    return prisma.itineraryDay.create({
      data: { ...data, workspaceId, tripId },
    });
  }

  static async createManyDays(
    workspaceId: string,
    tripId: string,
    items: Prisma.ItineraryDayUncheckedCreateInput[],
  ): Promise<number> {
    const result = await prisma.itineraryDay.createMany({
      data: items.map((item) => ({ ...item, workspaceId, tripId })),
    });
    return result.count;
  }

  static async updateDay(
    dayId: string,
    workspaceId: string,
    data: Prisma.ItineraryDayUncheckedUpdateInput,
  ): Promise<Prisma.ItineraryDayGetPayload<object>> {
    return prisma.itineraryDay.update({ where: { id: dayId }, data });
  }

  static async deleteDay(
    dayId: string,
    workspaceId: string,
  ): Promise<Prisma.ItineraryDayGetPayload<object>> {
    return prisma.itineraryDay.delete({ where: { id: dayId } });
  }

  static async deleteAllDays(
    tripId: string,
    workspaceId: string,
  ): Promise<void> {
    await prisma.itineraryDay.deleteMany({ where: { tripId, workspaceId } });
  }

  static async findDayByNumber(
    tripId: string,
    workspaceId: string,
    dayNumber: number,
  ): Promise<Prisma.ItineraryDayGetPayload<object> | null> {
    return prisma.itineraryDay.findFirst({
      where: { tripId, workspaceId, dayNumber },
    });
  }

  static async findDaysByIds(
    dayIds: string[],
    workspaceId: string,
  ): Promise<Prisma.ItineraryDayGetPayload<object>[]> {
    return prisma.itineraryDay.findMany({
      where: { id: { in: dayIds }, workspaceId },
    });
  }

  /** Atomically reorder days within one transaction. */
  static async reorderDays(
    workspaceId: string,
    tripId: string,
    items: { id: string; dayNumber: number }[],
  ): Promise<void> {
    await prisma.$transaction(
      items.map((item) =>
        prisma.itineraryDay.update({
          where: { id: item.id },
          data: { dayNumber: item.dayNumber },
        }),
      ),
    );
  }

  static async listVersions(
    tripId: string,
    workspaceId: string,
  ): Promise<Prisma.ItineraryVersionGetPayload<object>[]> {
    return prisma.itineraryVersion.findMany({
      where: { tripId, workspaceId },
      orderBy: { version: "desc" },
    });
  }

  static async findVersionById(
    versionId: string,
    workspaceId: string,
  ): Promise<Prisma.ItineraryVersionGetPayload<object> | null> {
    return prisma.itineraryVersion.findFirst({
      where: { id: versionId, workspaceId },
    });
  }

  static async findPublishedVersion(
    tripId: string,
    workspaceId: string,
  ): Promise<Prisma.ItineraryVersionGetPayload<object> | null> {
    return prisma.itineraryVersion.findFirst({
      where: { tripId, workspaceId, status: "PUBLISHED" },
    });
  }

  /** Next version number = max(version) + 1, starting at 1. */
  static async nextVersionNumber(
    tripId: string,
    workspaceId: string,
  ): Promise<number> {
    const latest = await prisma.itineraryVersion.findFirst({
      where: { tripId, workspaceId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return (latest?.version ?? 0) + 1;
  }

  static async createVersion(
    workspaceId: string,
    tripId: string,
    data: {
      version: number;
      status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      snapshot: Prisma.InputJsonValue;
      publishedAt?: Date | null;
      publishedById?: string | null;
      changeNotes?: string | null;
    },
  ): Promise<Prisma.ItineraryVersionGetPayload<object>> {
    return prisma.itineraryVersion.create({
      data: {
        workspaceId,
        tripId,
        version: data.version,
        status: data.status,
        snapshot: data.snapshot,
        publishedAt: data.publishedAt ?? null,
        publishedById: data.publishedById ?? null,
        changeNotes: data.changeNotes ?? null,
      },
    });
  }

  static async markPreviousPublishedArchived(
    tripId: string,
    workspaceId: string,
  ): Promise<number> {
    const result = await prisma.itineraryVersion.updateMany({
      where: { tripId, workspaceId, status: "PUBLISHED" },
      data: { status: "ARCHIVED" },
    });
    return result.count;
  }
}
