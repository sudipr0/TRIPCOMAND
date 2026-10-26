import type { Prisma } from "@prisma/client";
import type { ItineraryDayDetail } from '@trailcomand/shared';
import type { PublishItineraryInput } from '@trailcomand/shared';
import type { ItineraryVersionDetail } from '@trailcomand/shared';
import type { DayStatusValue } from '@trailcomand/shared';
import type { CreateItineraryDayInput } from '@trailcomand/shared';
import type { UpdateItineraryDayInput } from '@trailcomand/shared';

import { AppError } from "../../lib/errors.js";
import { rawPrisma } from "../../lib/prisma.js";
import { logAuditEvent } from "../../lib/audit.js";
import { TripRepository } from "../trip/trip.repository.js";
import { ItineraryRepository } from "./itinerary.repository.js";

/** Editing the itinerary is allowed only while the trip is in planning. */
const EDITABLE_STATUSES = new Set(["PLANNING"]);

function toDayDetail(d: Prisma.ItineraryDayGetPayload<object>): ItineraryDayDetail {
  return {
    id: d.id,
    workspaceId: d.workspaceId,
    tripId: d.tripId,
    dayNumber: d.dayNumber,
    title: d.title,
    description: d.description,
    location: d.location,
    startLocation: d.startLocation,
    endLocation: d.endLocation,
    altitude: d.altitude,
    elevationGain: d.elevationGain,
    distanceKm: d.distanceKm ? d.distanceKm.toString() : null,
    startTime: d.startTime,
    endTime: d.endTime,
    walkingHours: d.walkingHours ? d.walkingHours.toString() : null,
    accommodation: d.accommodation,
    meals: d.meals,
    activities: d.activities,
    clientVisible: d.clientVisible,
    internalNotes: d.internalNotes,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

function toVersionDetail(
  v: Prisma.ItineraryVersionGetPayload<object>,
  includeSnapshot = false,
): ItineraryVersionDetail {
  return {
    id: v.id,
    workspaceId: v.workspaceId,
    tripId: v.tripId,
    version: v.version,
    status: v.status,
    ...(includeSnapshot ? { snapshot: v.snapshot } : {}),
    publishedAt: v.publishedAt ? v.publishedAt.toISOString() : null,
    publishedById: v.publishedById,
    changeNotes: v.changeNotes,
    createdAt: v.createdAt.toISOString(),
  };
}

function toUncheckedDay(
  input: CreateItineraryDayInput | UpdateItineraryDayInput,
): Prisma.ItineraryDayUncheckedCreateInput {
  return {
    ...(input.dayNumber !== undefined ? { dayNumber: input.dayNumber } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description ?? null } : {}),
    ...(input.location !== undefined ? { location: input.location ?? null } : {}),
    ...(input.startLocation !== undefined ? { startLocation: input.startLocation ?? null } : {}),
    ...(input.endLocation !== undefined ? { endLocation: input.endLocation ?? null } : {}),
    ...(input.altitude !== undefined ? { altitude: input.altitude ?? null } : {}),
    ...(input.elevationGain !== undefined ? { elevationGain: input.elevationGain ?? null } : {}),
    ...(input.distanceKm !== undefined ? { distanceKm: input.distanceKm ?? null } : {}),
    ...(input.startTime !== undefined ? { startTime: input.startTime ?? null } : {}),
    ...(input.endTime !== undefined ? { endTime: input.endTime ?? null } : {}),
    ...(input.walkingHours !== undefined ? { walkingHours: input.walkingHours ?? null } : {}),
    ...(input.accommodation !== undefined ? { accommodation: input.accommodation ?? null } : {}),
    ...(input.meals !== undefined ? { meals: input.meals ?? [] } : {}),
    ...(input.activities !== undefined ? { activities: input.activities ?? [] } : {}),
    ...(input.clientVisible !== undefined ? { clientVisible: input.clientVisible } : {}),
    ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes ?? null } : {}),
  } as Prisma.ItineraryDayUncheckedCreateInput;
}

export class ItineraryService {
  static async listDays(
    workspaceId: string,
    tripId: string,
  ): Promise<ItineraryDayDetail[]> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found");
    }
    const days = await ItineraryRepository.listDays(tripId, workspaceId);
    return days.map(toDayDetail);
  }

  static async getDay(
    workspaceId: string,
    tripId: string,
    dayId: string,
  ): Promise<ItineraryDayDetail> {
    const day = await ItineraryRepository.findDayById(dayId, workspaceId);
    if (!day || day.tripId !== tripId) {
      throw AppError.notFound("Itinerary day not found");
    }
    return toDayDetail(day);
  }

  static async createDay(
    workspaceId: string,
    userId: string,
    tripId: string,
    input: CreateItineraryDayInput,
  ): Promise<ItineraryDayDetail> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }
    if (!EDITABLE_STATUSES.has(trip.status)) {
      throw AppError.conflict("Itinerary is locked once the trip leaves planning");
    }

    const existing = await ItineraryRepository.findDayByNumber(
      tripId,
      workspaceId,
      input.dayNumber,
    );
    if (existing) {
      throw AppError.conflict(`Day ${input.dayNumber} already exists for this trip`);
    }

    const created = await ItineraryRepository.createDay(
      workspaceId,
      tripId,
      toUncheckedDay(input),
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.itinerary.day.added",
      entityType: "itinerary_day",
      entityId: created.id,
      details: { tripId, dayNumber: created.dayNumber, title: created.title },
    });

    return toDayDetail(created);
  }

  static async populateFromTemplate(
    workspaceId: string,
    userId: string,
    tripId: string,
    templateId: string,
  ): Promise<ItineraryDayDetail[]> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }
    if (!EDITABLE_STATUSES.has(trip.status)) {
      throw AppError.conflict("Itinerary is locked once the trip leaves planning");
    }

    const existingDays = await ItineraryRepository.listDays(tripId, workspaceId);
    if (existingDays.length > 0) {
      throw AppError.conflict("Itinerary has already been populated for this trip");
    }

    const template = await rawPrisma.trekTemplate.findFirst({
      where: { id: templateId, workspaceId, deletedAt: null },
      include: { days: { orderBy: { dayNumber: "asc" } } },
    });
    if (!template) {
      throw AppError.notFound("Trek template not found in this workspace");
    }
    if (template.days.length === 0) {
      throw AppError.conflict("Template has no days to copy");
    }

    const created = await ItineraryRepository.createManyDays(
      workspaceId,
      tripId,
      template.days.map(
        (day) =>
          ({
            dayNumber: day.dayNumber,
            title: day.title,
            description: day.description,
            location: day.startLocation ?? null,
            altitude: day.altitude,
            walkingHours: day.walkingHours ? Number(day.walkingHours) : null,
            accommodation: day.accommodation,
            meals: day.meals,
            activities: day.activities,
            clientVisible: true,
            internalNotes: null,
          }) as Prisma.ItineraryDayUncheckedCreateInput,
      ),
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.itinerary.populated_from_template",
      entityType: "itinerary_day",
      entityId: tripId,
      details: { tripId, templateId, dayCount: created },
    });

    const days = await ItineraryRepository.listDays(tripId, workspaceId);
    return days.map(toDayDetail);
  }

  static async updateDay(
    workspaceId: string,
    userId: string,
    tripId: string,
    dayId: string,
    input: UpdateItineraryDayInput,
  ): Promise<ItineraryDayDetail> {
    const existing = await ItineraryRepository.findDayById(dayId, workspaceId);
    if (!existing || existing.tripId !== tripId) {
      throw AppError.notFound("Itinerary day not found");
    }
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip || !EDITABLE_STATUSES.has(trip.status)) {
      throw AppError.conflict("Itinerary is locked once the trip leaves planning");
    }

    // If renumbering, ensure the target day number is free.
    if (input.dayNumber !== undefined && input.dayNumber !== existing.dayNumber) {
      const clash = await ItineraryRepository.findDayByNumber(
        tripId,
        workspaceId,
        input.dayNumber,
      );
      if (clash && clash.id !== dayId) {
        throw AppError.conflict(`Day ${input.dayNumber} already exists for this trip`);
      }
    }

    const updated = await ItineraryRepository.updateDay(
      dayId,
      workspaceId,
      toUncheckedDay(input),
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.itinerary.day.updated",
      entityType: "itinerary_day",
      entityId: dayId,
      details: { tripId, changedFields: Object.keys(input) },
    });

    return toDayDetail(updated);
  }

  /**
   * Live timeline status, editable at any point in the trip's life (unlike the
   * content edits above, which are locked once planning ends). A guide finishing
   * Day 1 while the trip is IN_PROGRESS is the normal case, so this deliberately
   * does not check EDITABLE_STATUSES.
   */
  static async updateDayStatus(
    workspaceId: string,
    userId: string,
    tripId: string,
    dayId: string,
    status: DayStatusValue,
  ): Promise<ItineraryDayDetail> {
    const day = await ItineraryRepository.findDayById(dayId, workspaceId);
    if (!day || day.tripId !== tripId) {
      throw AppError.notFound("Itinerary day not found");
    }

    const updated = await ItineraryRepository.updateDay(dayId, workspaceId, { status });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "itinerary.day.status.updated",
      entityType: "itinerary_day",
      entityId: dayId,
      details: {
        tripId,
        dayNumber: day.dayNumber,
        previousStatus: day.status,
        status,
      },
    });

    return toDayDetail(updated);
  }

  static async deleteDay(
    workspaceId: string,
    userId: string,
    tripId: string,
    dayId: string,
  ): Promise<{ success: true; id: string }> {    const existing = await ItineraryRepository.findDayById(dayId, workspaceId);
    if (!existing || existing.tripId !== tripId) {
      throw AppError.notFound("Itinerary day not found");
    }
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip || !EDITABLE_STATUSES.has(trip.status)) {
      throw AppError.conflict("Itinerary is locked once the trip leaves planning");
    }

    await ItineraryRepository.deleteDay(dayId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.itinerary.day.deleted",
      entityType: "itinerary_day",
      entityId: dayId,
      details: { tripId, dayNumber: existing.dayNumber, title: existing.title },
    });

    return { success: true, id: dayId };
  }

  static async reorderDays(
    workspaceId: string,
    userId: string,
    tripId: string,
    items: { id: string; dayNumber: number }[],
  ): Promise<ItineraryDayDetail[]> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }
    if (!EDITABLE_STATUSES.has(trip.status)) {
      throw AppError.conflict("Itinerary is locked once the trip leaves planning");
    }

    // All day ids must belong to this trip and workspace.
    const days = await ItineraryRepository.findDaysByIds(
      items.map((item) => item.id),
      workspaceId,
    );
    if (days.length !== items.length) {
      throw AppError.badRequest("One or more itinerary days do not belong to this trip");
    }
    for (const day of days) {
      if (day.tripId !== tripId) {
        throw AppError.badRequest("One or more itinerary days do not belong to this trip");
      }
    }

    // Ensure target day numbers are all distinct and within the trip's day set.
    const requestedNumbers = items.map((item) => item.dayNumber);
    if (new Set(requestedNumbers).size !== requestedNumbers.length) {
      throw AppError.badRequest("Duplicate day numbers in reorder request");
    }

    await ItineraryRepository.reorderDays(workspaceId, tripId, items);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.itinerary.reordered",
      entityType: "itinerary_day",
      entityId: tripId,
      details: { tripId, items },
    });

    const updated = await ItineraryRepository.listDays(tripId, workspaceId);
    return updated.map(toDayDetail);
  }

  static async publishItinerary(
    workspaceId: string,
    userId: string,
    tripId: string,
    input: PublishItineraryInput,
  ): Promise<ItineraryVersionDetail> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }
    if (!["PLANNING", "READY"].includes(trip.status)) {
      throw AppError.conflict(
        "Itinerary can only be published while the trip is in planning or ready",
      );
    }

    const days = await ItineraryRepository.listDays(tripId, workspaceId);
    if (days.length === 0) {
      throw AppError.conflict("Cannot publish an empty itinerary");
    }

    // Archive any previously published version.
    await ItineraryRepository.markPreviousPublishedArchived(tripId, workspaceId);

    const versionNumber = await ItineraryRepository.nextVersionNumber(
      tripId,
      workspaceId,
    );
    const publishedAt = new Date();
    const snapshot = {
      days: days.map(toDayDetail),
      publishedAt: publishedAt.toISOString(),
      dayCount: days.length,
    } as unknown as Prisma.InputJsonValue;
    const created = await ItineraryRepository.createVersion(workspaceId, tripId, {
      version: versionNumber,
      status: "PUBLISHED",
      snapshot,
      publishedAt,
      publishedById: userId,
      changeNotes: input.changeNotes ?? null,
    });

    await TripRepository.setPublishedVersion(tripId, workspaceId, created.id);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.itinerary.published",
      entityType: "itinerary_version",
      entityId: created.id,
      details: { tripId, version: versionNumber, dayCount: days.length },
    });

    return toVersionDetail(created, true);
  }

  static async listVersions(
    workspaceId: string,
    tripId: string,
  ): Promise<ItineraryVersionDetail[]> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found");
    }
    const versions = await ItineraryRepository.listVersions(tripId, workspaceId);
    return versions.map((v) => toVersionDetail(v));
  }

  static async getVersion(
    workspaceId: string,
    tripId: string,
    versionId: string,
  ): Promise<ItineraryVersionDetail> {
    const version = await ItineraryRepository.findVersionById(versionId, workspaceId);
    if (!version || version.tripId !== tripId) {
      throw AppError.notFound("Itinerary version not found");
    }
    return toVersionDetail(version, true);
  }
}
