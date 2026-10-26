import type { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";
import { dayStatusForReportSeverity, dayStatusStore, setDayStatusFromEvent } from "../itinerary/day-status.js";

const CHECK_IN_INCLUDE = {
  staff: { select: { id: true, fullName: true, staffType: true } },
} as const;

const REPORT_INCLUDE = {} as const;

type CheckInRow = Prisma.FieldCheckInGetPayload<{ include: typeof CHECK_IN_INCLUDE }>;
type ReportRow = Prisma.FieldReportGetPayload<{ include: typeof REPORT_INCLUDE }>;

/**
 * Field data is always scoped by workspaceId, and by tripId whenever the caller
 * has one. Check-ins and reports are written once and never mutated, so the only
 * write is an upsert keyed on the device-generated clientId (sync retries).
 */
export class FieldRepository {
  static async findTrip(workspaceId: string, tripId: string) {
    return prisma.trip.findFirst({
      where: { id: tripId, workspaceId, deletedAt: null },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        tripNumber: true,
        startDate: true,
        endDate: true,
        status: true,
        groupSize: true,
        leadGuideId: true,
      },
    });
  }

  static async findStaffByUserId(workspaceId: string, userId: string) {
    return prisma.staffProfile.findFirst({
      where: { workspaceId, userId, deletedAt: null },
      select: { id: true, staffType: true, fullName: true },
    });
  }

  static async findStaff(workspaceId: string, staffId: string) {
    return prisma.staffProfile.findFirst({
      where: { id: staffId, workspaceId, deletedAt: null },
      select: { id: true, staffType: true, fullName: true },
    });
  }

  /** A guide may report for a trip they are assigned to, as lead guide, or that they manage. */
  static async isAssigned(workspaceId: string, tripId: string, staffId: string) {
    const assignment = await prisma.staffAssignment.findFirst({
      where: { workspaceId, tripId, staffId, status: { not: "CANCELLED" }, deletedAt: null },
      select: { id: true },
    });
    return Boolean(assignment);
  }

  static async listTripsForUser(workspaceId: string, userId: string) {
    return prisma.trip.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        status: { in: ["PLANNING", "READY", "IN_PROGRESS"] },
        OR: [
          { operationsManagerId: userId },
          { leadGuide: { userId } },
          { staffAssignments: { some: { staff: { userId }, status: { not: "CANCELLED" }, deletedAt: null } } },
        ],
      },
      orderBy: { startDate: "asc" },
    });
  }

  static async findCheckInByClientId(clientId: string): Promise<CheckInRow | null> {
    return prisma.fieldCheckIn.findUnique({ where: { clientId }, include: CHECK_IN_INCLUDE });
  }

  static async upsertCheckIn(
    workspaceId: string,
    tripId: string,
    staffId: string,
    data: {
      checkInType: Prisma.FieldCheckInUncheckedCreateInput["checkInType"];
      location: string | null;
      latitude: number | null;
      longitude: number | null;
      altitude: number | null;
      message: string | null;
      photoUrls: string[];
      recordedAt: Date;
      clientId: string;
    },
  ): Promise<CheckInRow> {
    return prisma.fieldCheckIn.upsert({
      where: { clientId: data.clientId },
      update: {},
      create: {
        workspaceId,
        tripId,
        staffId,
        checkInType: data.checkInType,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.altitude,
        message: data.message,
        photoUrls: data.photoUrls,
        recordedAt: data.recordedAt,
        syncedAt: new Date(),
        clientId: data.clientId,
      },
      include: CHECK_IN_INCLUDE,
    });
  }

  static async findReportByClientId(clientId: string): Promise<ReportRow | null> {
    return prisma.fieldReport.findUnique({ where: { clientId }, include: REPORT_INCLUDE });
  }

  static async upsertReport(
    workspaceId: string,
    tripId: string,
    reporterId: string,
    data: {
      reportType: Prisma.FieldReportUncheckedCreateInput["reportType"];
      severity: Prisma.FieldReportUncheckedCreateInput["severity"];
      description: string;
      location: string | null;
      photoUrls: string[];
      recordedAt: Date;
      clientId: string;
      itineraryDayId?: string | null;
    },
  ): Promise<ReportRow> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.fieldReport.findUnique({
        where: { clientId: data.clientId },
        select: { id: true },
      });
      const report = await tx.fieldReport.upsert({
        where: { clientId: data.clientId },
        update: {},
        create: {
          workspaceId,
          tripId,
          reporterId,
          reportType: data.reportType,
          severity: data.severity,
          description: data.description,
          location: data.location,
          photoUrls: data.photoUrls,
          recordedAt: data.recordedAt,
          syncedAt: new Date(),
          clientId: data.clientId,
          itineraryDayId: data.itineraryDayId ?? null,
        },
      });

      // Only a freshly created report moves the timeline: a retried mobile sync
      // reuses the same clientId and must not re-apply its side effect.
      const isNew = existing === null;
      if (isNew && data.itineraryDayId) {
        await setDayStatusFromEvent(dayStatusStore(tx, { workspaceId, tripId }), {
          workspaceId,
          tripId,
          dayId: data.itineraryDayId,
          status: dayStatusForReportSeverity(report.severity),
          entityType: "field_report",
          entityId: report.id,
        });
      }

      return report;
    });
  }

  static async listCheckIns(workspaceId: string, tripId?: string): Promise<CheckInRow[]> {
    return prisma.fieldCheckIn.findMany({
      where: { workspaceId, ...(tripId ? { tripId } : {}) },
      orderBy: { recordedAt: "desc" },
      include: CHECK_IN_INCLUDE,
    });
  }

  static async listReports(workspaceId: string, tripId?: string): Promise<ReportRow[]> {
    return prisma.fieldReport.findMany({
      where: { workspaceId, ...(tripId ? { tripId } : {}) },
      orderBy: { recordedAt: "desc" },
    });
  }

  static async listForTripIds(workspaceId: string, tripIds: string[]) {
    if (!tripIds.length) {
      return { checkIns: [] as CheckInRow[], reports: [] as ReportRow[] };
    }
    const [checkIns, reports] = await Promise.all([
      prisma.fieldCheckIn.findMany({
        where: { workspaceId, tripId: { in: tripIds } },
        orderBy: { recordedAt: "desc" },
        include: CHECK_IN_INCLUDE,
      }),
      prisma.fieldReport.findMany({
        where: { workspaceId, tripId: { in: tripIds } },
        orderBy: { recordedAt: "desc" },
      }),
    ]);
    return { checkIns, reports };
  }

  static async findItineraryDays(tripIds: string[]) {
    if (!tripIds.length) return [];
    return prisma.itineraryDay.findMany({
      where: { tripId: { in: tripIds } },
      select: { tripId: true, dayNumber: true, title: true },
    });
  }
}
