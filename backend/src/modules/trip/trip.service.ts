import type { Prisma } from "@prisma/client";
import type { ReadinessSummary } from '@trailcomand/shared';
import type { TripDetail, ListTripsResult } from '@trailcomand/shared';
import type { ListTripsQuery, AssignTripInput } from '@trailcomand/shared';
import type { CreateTripInput, UpdateTripInput } from '@trailcomand/shared';

import { AppError } from "../../lib/errors.js";
import { rawPrisma } from "../../lib/prisma.js";
import { logAuditEvent } from "../../lib/audit.js";
import { TripRepository } from "./trip.repository.js";
import { BookingRepository } from "../booking/booking.repository.js";

type TripWithRelations = Prisma.TripGetPayload<{
  include: {
    travelers: { orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }] };
    itineraryDays: { orderBy: { dayNumber: "asc" } };
  };
}>;

function toTravelerDetail(t: TripWithRelations["travelers"][number]) {
  return {
    id: t.id,
    workspaceId: t.workspaceId,
    tripId: t.tripId,
    customerId: t.customerId,
    fullName: t.fullName,
    email: t.email,
    phone: t.phone,
    nationality: t.nationality,
    dateOfBirth: t.dateOfBirth ? t.dateOfBirth.toISOString() : null,
    passportNumber: t.passportNumber,
    passportExpiry: t.passportExpiry ? t.passportExpiry.toISOString() : null,
    emergencyContactName: t.emergencyContactName,
    emergencyContactPhone: t.emergencyContactPhone,
    dietaryRequirements: t.dietaryRequirements,
    medicalNotes: t.medicalNotes,
    insuranceProvider: t.insuranceProvider,
    insurancePolicyNumber: t.insurancePolicyNumber,
    isTripLeader: t.isTripLeader,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function toItineraryDayDetail(d: TripWithRelations["itineraryDays"][number]) {
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

function toTripDetail(trip: TripWithRelations): TripDetail {
  return {
    id: trip.id,
    workspaceId: trip.workspaceId,
    bookingId: trip.bookingId,
    customerId: trip.customerId,
    tripNumber: trip.tripNumber,
    name: trip.name,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    groupSize: trip.groupSize,
    status: trip.status,
    operationsManagerId: trip.operationsManagerId,
    leadGuideId: trip.leadGuideId,
    publishedItineraryVersionId: trip.publishedItineraryVersionId,
    notes: trip.notes,
    travelers: trip.travelers?.map(toTravelerDetail),
    itineraryDays: trip.itineraryDays?.map(toItineraryDayDetail),
    metadata: trip.metadata,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    deletedAt: trip.deletedAt ? trip.deletedAt.toISOString() : null,
  };
}

/** Valid status transitions for the trip lifecycle. */
const VALID_TRANSITIONS: Record<string, string[]> = {
  PLANNING: ["READY", "CANCELLED"],
  READY: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export class TripService {
  static async listTrips(
    workspaceId: string,
    filter: ListTripsQuery,
  ): Promise<ListTripsResult> {
    const { total, items } = await TripRepository.listTrips(workspaceId, filter);
    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map((t) => toTripDetail(t as TripWithRelations)),
    };
  }

  static async getTrip(workspaceId: string, tripId: string): Promise<TripDetail> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found");
    }
    return toTripDetail(trip);
  }

  static async createTrip(
    workspaceId: string,
    userId: string,
    input: CreateTripInput,
  ): Promise<TripDetail> {
    // Booking, if provided, must exist and not already be linked to a trip.
    if (input.bookingId) {
      const booking = await BookingRepository.findById(input.bookingId, workspaceId);
      if (!booking) {
        throw AppError.notFound("Booking not found in this workspace");
      }
      const existingTrip = await TripRepository.findByBooking(
        input.bookingId,
        workspaceId,
      );
      if (existingTrip) {
        throw AppError.conflict("Booking is already linked to a trip");
      }
    }

    // Customer must exist in the workspace.
    const customer = await rawPrisma.customer.findFirst({
      where: { id: input.customerId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) {
      throw AppError.notFound("Customer not found in this workspace");
    }

    // Ops manager must be an active workspace member.
    if (input.operationsManagerId) {
      const membership = await rawPrisma.membership.findFirst({
        where: {
          workspaceId,
          userId: input.operationsManagerId,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!membership) {
        throw AppError.badRequest(
          "Operations manager is not an active member of this workspace",
        );
      }
    }

    // Lead guide must be a staff profile in the workspace.
    if (input.leadGuideId) {
      const staff = await rawPrisma.staffProfile.findFirst({
        where: { id: input.leadGuideId, workspaceId, deletedAt: null },
        select: { id: true },
      });
      if (!staff) {
        throw AppError.badRequest("Lead guide not found in this workspace");
      }
    }

    const tripNumber = await TripRepository.generateNumber(workspaceId);
    const created = await TripRepository.create(workspaceId, {
      bookingId: input.bookingId ?? null,
      customerId: input.customerId,
      tripNumber,
      name: input.name,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      groupSize: input.groupSize,
      operationsManagerId: input.operationsManagerId ?? null,
      leadGuideId: input.leadGuideId ?? null,
      notes: input.notes ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.created",
      entityType: "trip",
      entityId: created.id,
      details: { tripNumber, bookingId: input.bookingId ?? null },
    });

    return toTripDetail(created);
  }

  /**
   * Create the trip skeleton automatically when a booking is created from a
   * quotation. Not exposed via routes; invoked from BookingService.
   */
  static async createTripFromBooking(
    workspaceId: string,
    userId: string,
    booking: {
      id: string;
      customerId: string;
      trekName: string;
      startDate: Date;
      endDate: Date;
      groupSize: number;
    },
  ): Promise<TripDetail> {
    const tripNumber = await TripRepository.generateNumber(workspaceId);
    const created = await TripRepository.create(workspaceId, {
      bookingId: booking.id,
      customerId: booking.customerId,
      tripNumber,
      name: booking.trekName,
      startDate: booking.startDate,
      endDate: booking.endDate,
      groupSize: booking.groupSize,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.auto_created_from_booking",
      entityType: "trip",
      entityId: created.id,
      details: { tripNumber, bookingId: booking.id },
    });

    return toTripDetail(created);
  }

  static async updateTrip(
    workspaceId: string,
    tripId: string,
    userId: string,
    input: UpdateTripInput,
  ): Promise<TripDetail> {
    const existing = await TripRepository.findById(tripId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Trip not found");
    }

    const updateData: Prisma.TripUpdateInput = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.startDate !== undefined)
      updateData.startDate = new Date(input.startDate);
    if (input.endDate !== undefined) updateData.endDate = new Date(input.endDate);
    if (input.groupSize !== undefined) updateData.groupSize = input.groupSize;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.metadata !== undefined)
      updateData.metadata = input.metadata as Prisma.InputJsonValue;

    const updated = await TripRepository.update(tripId, workspaceId, updateData);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.updated",
      entityType: "trip",
      entityId: tripId,
      details: {
        tripNumber: existing.tripNumber,
        changedFields: Object.keys(input),
      },
    });

    return toTripDetail(updated);
  }

  static async updateStatus(
    workspaceId: string,
    tripId: string,
    userId: string,
    status: string,
  ): Promise<TripDetail> {
    const existing = await TripRepository.findById(tripId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Trip not found");
    }

    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      throw AppError.conflict(
        `Invalid status transition: ${existing.status} -> ${status}`,
      );
    }

    // PLANNING -> READY requires no blocking readiness issues.
    if (existing.status === "PLANNING" && status === "READY") {
      const readiness = await TripService.getReadiness(workspaceId, tripId);
      if (readiness.status === "BLOCKED") {
        throw AppError.conflict(
          `Trip cannot move to READY: ${readiness.blockingIssues.join("; ")}`,
        );
      }
    }

    const updated = await TripRepository.updateStatus(tripId, workspaceId, status);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.status.changed",
      entityType: "trip",
      entityId: tripId,
      details: { tripNumber: existing.tripNumber, from: existing.status, to: status },
    });

    return toTripDetail(updated);
  }

  static async assign(
    workspaceId: string,
    tripId: string,
    userId: string,
    input: AssignTripInput,
  ): Promise<TripDetail> {
    const existing = await TripRepository.findById(tripId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Trip not found");
    }

    if (input.operationsManagerId) {
      const membership = await rawPrisma.membership.findFirst({
        where: { workspaceId, userId: input.operationsManagerId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!membership) {
        throw AppError.badRequest(
          "Operations manager is not an active member of this workspace",
        );
      }
    }
    if (input.leadGuideId) {
      const staff = await rawPrisma.staffProfile.findFirst({
        where: { id: input.leadGuideId, workspaceId, deletedAt: null },
        select: { id: true },
      });
      if (!staff) {
        throw AppError.badRequest("Lead guide not found in this workspace");
      }
    }

    const updated = await TripRepository.assign(tripId, workspaceId, input);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.assigned",
      entityType: "trip",
      entityId: tripId,
      details: {
        tripNumber: existing.tripNumber,
        from: {
          operationsManagerId: existing.operationsManagerId,
          leadGuideId: existing.leadGuideId,
        },
        to: {
          operationsManagerId: updated.operationsManagerId,
          leadGuideId: updated.leadGuideId,
        },
      },
    });

    return toTripDetail(updated);
  }

  static async deleteTrip(
    workspaceId: string,
    tripId: string,
    userId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await TripRepository.findById(tripId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Trip not found");
    }

    await TripRepository.softDelete(tripId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.deleted",
      entityType: "trip",
      entityId: tripId,
      details: { tripNumber: existing.tripNumber },
    });

    return { success: true, id: tripId };
  }

  /**
   * Compute trip readiness. Derived on every call — never stored.
   */
  static async getReadiness(
    workspaceId: string,
    tripId: string,
  ): Promise<ReadinessSummary> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found");
    }

    const itineraryPublished = trip.publishedItineraryVersionId !== null;
    const travelerCount = trip.travelers.length;
    const hasOperationsManager = trip.operationsManagerId !== null;
    const hasLeadGuide = trip.leadGuideId !== null;

    const blockingIssues: string[] = [];
    if (travelerCount === 0) {
      blockingIssues.push("No travelers added");
    }
    if (!hasOperationsManager) {
      blockingIssues.push("No operations manager assigned");
    }

    const warnings: string[] = [];
    if (!hasLeadGuide) {
      warnings.push("Lead guide not yet assigned");
    }
    if (!itineraryPublished) {
      warnings.push("Itinerary not yet published");
    }

    let status: ReadinessSummary["status"];
    if (blockingIssues.length > 0) {
      status = "BLOCKED";
    } else if (warnings.length > 0) {
      status = "PARTIAL";
    } else if (travelerCount > 0 || itineraryPublished) {
      status = "READY";
    } else {
      status = "NOT_READY";
    }

    return {
      status,
      itineraryPublished,
      travelerCount,
      hasOperationsManager,
      hasLeadGuide,
      blockingIssues,
      warnings,
    };
  }
}
