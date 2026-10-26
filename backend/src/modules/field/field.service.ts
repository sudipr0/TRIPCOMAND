import type {
  CheckInType,
  CreateCheckInInput,
  CreateFieldReportInput,
  FieldCheckInDetail,
  FieldReportDetail,
  FieldTripList,
  FieldTripSummary,
  TripFieldData,
} from "@trailcomand/shared";
import type { Prisma } from "@prisma/client";

import { logger } from "../../lib/logger.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import { FieldRepository } from "./field.repository.js";

type CheckInRow = Prisma.FieldCheckInGetPayload<{
  include: { staff: { select: { id: true; fullName: true; staffType: true } } };
}>;
type ReportRow = Prisma.FieldReportGetPayload<object>;

const DAY = 86_400_000;
/** A gap this large between record time and sync time means the device was offline. */
const SYNC_GRACE_MS = 2 * 60 * 1000;

function toCheckInDetail(row: CheckInRow): FieldCheckInDetail {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    tripId: row.tripId,
    staffId: row.staffId,
    checkInType: row.checkInType,
    location: row.location,
    latitude: row.latitude !== null ? row.latitude.toString() : null,
    longitude: row.longitude !== null ? row.longitude.toString() : null,
    altitude: row.altitude,
    message: row.message,
    photoUrls: row.photoUrls,
    recordedAt: row.recordedAt.toISOString(),
    syncedAt: row.syncedAt ? row.syncedAt.toISOString() : null,
    clientId: row.clientId,
    createdAt: row.createdAt.toISOString(),
    staff: row.staff
      ? { id: row.staff.id, fullName: row.staff.fullName, staffType: row.staff.staffType }
      : undefined,
  };
}

function toReportDetail(row: ReportRow): FieldReportDetail {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    tripId: row.tripId,
    reporterId: row.reporterId,
    reportType: row.reportType,
    severity: row.severity,
    description: row.description,
    location: row.location,
    photoUrls: row.photoUrls,
    recordedAt: row.recordedAt.toISOString(),
    syncedAt: row.syncedAt ? row.syncedAt.toISOString() : null,
    clientId: row.clientId,
    itineraryDayId: row.itineraryDayId ?? null,
    createdAt: row.createdAt.toISOString(),
    reporter: null,
  };
}

/** Latest calendar day of the trip, clamped to the configured day count (1-based). */
function todayDayNumber(startDate: Date, endDate: Date, now = new Date()): number | null {
  const diff = Math.floor((now.getTime() - startDate.getTime()) / DAY);
  if (diff < 0) return null;
  const total = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / DAY) + 1);
  return Math.min(diff + 1, total);
}

export class FieldService {
  static async createCheckIn(
    workspaceId: string,
    userId: string,
    tripId: string,
    input: CreateCheckInInput,
  ): Promise<FieldCheckInDetail> {
    const trip = await FieldRepository.findTrip(workspaceId, tripId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }

    const staff = await FieldService.resolveStaff(workspaceId, userId, input.staffId ?? undefined);
    if (!staff) {
      throw AppError.forbidden("No staff profile is linked to this account");
    }
    if (staff.staffType !== "GUIDE" && staff.staffType !== "ASSISTANT") {
      throw AppError.badRequest("Only guide staff can send field check-ins");
    }

    const assigned =
      trip.leadGuideId === staff.id ||
      (await FieldRepository.isAssigned(workspaceId, tripId, staff.id));
    if (!assigned) {
      throw AppError.forbidden("Staff is not assigned to this trip");
    }

    // Retried syncs must be idempotent and harmless: return the stored row as-is.
    const existing = await FieldRepository.findCheckInByClientId(input.clientId);
    if (existing) {
      if (existing.workspaceId !== workspaceId || existing.tripId !== tripId) {
        throw AppError.conflict("Client id already used by another check-in");
      }
      return toCheckInDetail(existing);
    }

    const created = await FieldRepository.upsertCheckIn(workspaceId, tripId, staff.id, {
      checkInType: input.checkInType as CheckInType,
      location: input.location ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      altitude: input.altitude ?? null,
      message: input.message ?? null,
      photoUrls: input.photoUrls ?? [],
      recordedAt: new Date(input.recordedAt),
      clientId: input.clientId,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "field.checkin.created",
      entityType: "field_check_in",
      entityId: created.id,
      details: {
        tripId,
        staffId: staff.id,
        checkInType: created.checkInType,
        recordedAt: created.recordedAt.toISOString(),
        syncedLate: Date.now() - created.recordedAt.getTime() > SYNC_GRACE_MS,
      },
    });

    return toCheckInDetail(created);
  }

  static async createReport(
    workspaceId: string,
    userId: string,
    tripId: string,
    input: CreateFieldReportInput,
  ): Promise<FieldReportDetail> {
    const trip = await FieldRepository.findTrip(workspaceId, tripId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }

    // A guide may only file against a trip they are on; office users may file for any trip.
    const staff = await FieldRepository.findStaffByUserId(workspaceId, userId);
    if (staff) {
      const assigned =
        trip.leadGuideId === staff.id ||
        (await FieldRepository.isAssigned(workspaceId, tripId, staff.id));
      if (!assigned) {
        throw AppError.forbidden("Staff is not assigned to this trip");
      }
    }

    const existing = await FieldRepository.findReportByClientId(input.clientId);
    if (existing) {
      if (existing.workspaceId !== workspaceId || existing.tripId !== tripId) {
        throw AppError.conflict("Client id already used by another report");
      }
      return toReportDetail(existing);
    }

    const isEmergency = input.reportType === "EMERGENCY";
    const created = await FieldRepository.upsertReport(workspaceId, tripId, staff?.id ?? userId, {
      reportType: input.reportType,
      severity: isEmergency ? "URGENT" : input.severity,
      description: input.description,
      location: input.location ?? null,
      photoUrls: input.photoUrls ?? [],
      recordedAt: new Date(input.recordedAt),
      clientId: input.clientId,
      itineraryDayId: input.itineraryDayId ?? null,
    });

    if (isEmergency) {
      // Emergency reports bypass the normal review flow: one event is written so the
      // office alert feed and the audit trail both carry the highest priority marker.
      logger.warn(
        { workspaceId, tripId, reportId: created.id, reporterId: created.reporterId },
        "FIELD EMERGENCY reported",
      );
      await logAuditEvent({
        workspaceId,
        userId,
        action: "field.report.emergency",
        entityType: "field_report",
        entityId: created.id,
        details: {
          tripId,
          reporterId: created.reporterId,
          severity: created.severity,
          description: created.description,
          location: created.location,
          bypassedApproval: true,
        },
      });
    } else {
      await logAuditEvent({
        workspaceId,
        userId,
        action: "field.report.created",
        entityType: "field_report",
        entityId: created.id,
        details: {
          tripId,
          reporterId: created.reporterId,
          reportType: created.reportType,
          severity: created.severity,
          itineraryDayId: created.itineraryDayId,
        },
      });
    }

    return toReportDetail(created);
  }

  static async listTripFieldData(workspaceId: string, tripId: string): Promise<TripFieldData> {
    const trip = await FieldRepository.findTrip(workspaceId, tripId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }
    const [checkIns, reports] = await Promise.all([
      FieldRepository.listCheckIns(workspaceId, tripId),
      FieldRepository.listReports(workspaceId, tripId),
    ]);
    return {
      checkIns: checkIns.map(toCheckInDetail),
      reports: reports.map(toReportDetail),
    };
  }

  /** Guide home: the trips this account is assigned to, with today's itinerary and last check-in. */
  static async listMyTrips(workspaceId: string, userId: string): Promise<FieldTripList> {
    const staff = await FieldRepository.findStaffByUserId(workspaceId, userId);
    const trips = await FieldRepository.listTripsForUser(workspaceId, userId);
    const { checkIns, reports } = await FieldRepository.listForTripIds(
      workspaceId,
      trips.map((trip) => trip.id),
    );

    const today = new Date();
    const summaries: FieldTripSummary[] = [];
    const todaysDays = await FieldRepository.findItineraryDays(trips.map((trip) => trip.id));
    for (const trip of trips) {
      const dayNumber = todayDayNumber(trip.startDate, trip.endDate, today);
      const day = dayNumber
        ? todaysDays.find((row) => row.tripId === trip.id && row.dayNumber === dayNumber)
        : null;
      const lastCheckIn = checkIns.find((row) => row.tripId === trip.id);
      const emergencies = reports.filter(
        (row) => row.tripId === trip.id && row.reportType === "EMERGENCY",
      ).length;

      summaries.push({
        id: trip.id,
        tripNumber: trip.tripNumber,
        name: trip.name,
        startDate: trip.startDate.toISOString(),
        endDate: trip.endDate.toISOString(),
        status: trip.status,
        groupSize: trip.groupSize,
        leadGuideId: trip.leadGuideId,
        todayDayNumber: dayNumber,
        todayTitle: day?.title ?? null,
        lastCheckInAt: lastCheckIn ? lastCheckIn.recordedAt.toISOString() : null,
        openEmergencyReports: emergencies,
      });
    }

    return { trips: summaries, staffId: staff?.id ?? null };
  }

  private static async resolveStaff(
    workspaceId: string,
    userId: string,
    requestedStaffId?: string,
  ) {
    if (requestedStaffId) {
      return FieldRepository.findStaff(workspaceId, requestedStaffId);
    }
    return FieldRepository.findStaffByUserId(workspaceId, userId);
  }
}
