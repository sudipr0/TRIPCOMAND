import type { Prisma } from "@prisma/client";
import { SupplierBookingRepository } from "./supplier-booking.repository.js";
import { TripRepository } from "../trip/trip.repository.js";
import { SupplierRepository } from "../supplier/supplier.repository.js";
import { ItineraryRepository } from "../itinerary/itinerary.repository.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import type {
  CreateSupplierBookingInput,
  UpdateSupplierBookingInput,
  ListSupplierBookingsQuery,
  ConfirmSupplierBookingInput,
  RecordSupplierQuoteInput,
  CancelSupplierBookingInput,
  RecordSupplierBookingActualCostInput,
  SupplierBookingDetail,
  ListSupplierBookingsResult,
} from "@trailcomand/shared";

type RepoBooking = NonNullable<
  Awaited<ReturnType<typeof SupplierBookingRepository.findById>>
>;

function toSupplierBookingDetail(
  b: RepoBooking | Prisma.SupplierBookingGetPayload<object>,
): SupplierBookingDetail {
  const withRelations = b as RepoBooking;
  return {
    id: b.id,
    workspaceId: b.workspaceId,
    tripId: b.tripId,
    supplierId: b.supplierId,
    itineraryDayId: b.itineraryDayId,
    serviceType: b.serviceType,
    description: b.description,
    code: b.code,
    serviceDate: b.serviceDate.toISOString(),
    endDate: b.endDate ? b.endDate.toISOString() : null,
    startTime: b.startTime,
    endTime: b.endTime,
    quantity: b.quantity,
    unit: b.unit,
    estimatedCost:
      b.estimatedCost !== null && b.estimatedCost !== undefined
        ? b.estimatedCost.toString()
        : null,
    confirmedCost:
      b.confirmedCost !== null && b.confirmedCost !== undefined
        ? b.confirmedCost.toString()
        : null,
    actualCost:
      b.actualCost !== null && b.actualCost !== undefined
        ? b.actualCost.toString()
        : null,
    currency: b.currency,
    status: b.status,
    confirmationNumber: b.confirmationNumber,
    confirmedAt: b.confirmedAt ? b.confirmedAt.toISOString() : null,
    confirmedById: b.confirmedById,
    cancellationPolicy: b.cancellationPolicy,
    cancellationDeadline: b.cancellationDeadline
      ? b.cancellationDeadline.toISOString()
      : null,
    cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
    cancelledById: b.cancelledById,
    cancellationReason: b.cancellationReason,
    notes: b.notes,
    metadata: b.metadata,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    deletedAt: b.deletedAt ? b.deletedAt.toISOString() : null,
    supplier: withRelations.supplier
      ? {
          id: withRelations.supplier.id,
          name: withRelations.supplier.name,
          category: withRelations.supplier.category,
          phone: withRelations.supplier.phone,
        }
      : undefined,
    itineraryDay: withRelations.itineraryDay
      ? {
          id: withRelations.itineraryDay.id,
          dayNumber: withRelations.itineraryDay.dayNumber,
          title: withRelations.itineraryDay.title,
        }
      : null,
    trip: withRelations.trip
      ? {
          id: withRelations.trip.id,
          tripNumber: withRelations.trip.tripNumber,
          name: withRelations.trip.name,
          startDate: withRelations.trip.startDate.toISOString(),
          endDate: withRelations.trip.endDate.toISOString(),
        }
      : undefined,
  };
}

export class SupplierBookingService {
  static async listBookings(
    workspaceId: string,
    filter: ListSupplierBookingsQuery,
  ): Promise<ListSupplierBookingsResult> {
    const { total, items } = await SupplierBookingRepository.listBookings(
      workspaceId,
      filter,
    );
    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map(toSupplierBookingDetail),
    };
  }

  static async getBooking(
    workspaceId: string,
    bookingId: string,
  ): Promise<SupplierBookingDetail> {
    const booking = await SupplierBookingRepository.findById(
      bookingId,
      workspaceId,
    );
    if (!booking) {
      throw AppError.notFound("Supplier booking not found");
    }
    return toSupplierBookingDetail(booking);
  }

  static async createBooking(
    workspaceId: string,
    userId: string,
    input: CreateSupplierBookingInput,
  ): Promise<SupplierBookingDetail> {
    const trip = await TripRepository.findById(input.tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }
    if (!["PLANNING", "READY"].includes(trip.status)) {
      throw AppError.conflict(
        `Cannot add supplier bookings to a trip with status ${trip.status}`,
      );
    }

    const supplier = await SupplierRepository.findById(
      input.supplierId,
      workspaceId,
    );
    if (!supplier) {
      throw AppError.notFound("Supplier not found in this workspace");
    }
    if (supplier.status !== "ACTIVE") {
      throw AppError.conflict("Cannot book an inactive supplier");
    }

    if (input.itineraryDayId) {
      const day = await ItineraryRepository.findDayById(
        input.itineraryDayId,
        workspaceId,
      );
      if (!day) {
        throw AppError.notFound("Itinerary day not found in this workspace");
      }
      if (day.tripId !== input.tripId) {
        throw AppError.badRequest("Itinerary day does not belong to this trip");
      }
    }

    const serviceDate = new Date(input.serviceDate);
    if (serviceDate < trip.startDate || serviceDate > trip.endDate) {
      throw AppError.badRequest("Service date must fall within trip dates");
    }

    if (input.cancellationDeadline) {
      const deadline = new Date(input.cancellationDeadline);
      if (deadline > serviceDate) {
        throw AppError.badRequest(
          "Cancellation deadline must be on or before service date",
        );
      }
    }

    const created = await SupplierBookingRepository.create(workspaceId, {
      tripId: input.tripId,
      supplierId: input.supplierId,
      itineraryDayId: input.itineraryDayId ?? null,
      serviceType: input.serviceType,
      description: input.description,
      code: input.code ?? null,
      serviceDate,
      endDate: input.endDate ? new Date(input.endDate) : null,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      quantity: input.quantity ?? 1,
      unit: input.unit ?? null,
      estimatedCost:
        input.estimatedCost !== undefined ? input.estimatedCost : null,
      currency: input.currency ?? "NPR",
      status: "INQUIRY",
      cancellationPolicy: input.cancellationPolicy ?? null,
      cancellationDeadline: input.cancellationDeadline
        ? new Date(input.cancellationDeadline)
        : null,
      notes: input.notes ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier_booking.created",
      entityType: "supplier_booking",
      entityId: created.id,
      details: {
        tripId: input.tripId,
        supplierId: input.supplierId,
        serviceType: input.serviceType,
        serviceDate: input.serviceDate,
      },
    });

    return toSupplierBookingDetail(created);
  }

  static async updateBooking(
    workspaceId: string,
    userId: string,
    bookingId: string,
    input: UpdateSupplierBookingInput,
  ): Promise<SupplierBookingDetail> {
    const existing = await SupplierBookingRepository.findById(
      bookingId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Supplier booking not found");
    }

    if (!["INQUIRY", "REQUESTED", "QUOTED"].includes(existing.status)) {
      throw AppError.conflict(
        `Cannot update supplier booking in status ${existing.status}`,
      );
    }

    const serviceDate = input.serviceDate
      ? new Date(input.serviceDate)
      : existing.serviceDate;
    if (input.serviceDate) {
      const trip = await TripRepository.findById(existing.tripId, workspaceId);
      if (
        trip &&
        (serviceDate < trip.startDate || serviceDate > trip.endDate)
      ) {
        throw AppError.badRequest("Service date must fall within trip dates");
      }
    }

    if (input.cancellationDeadline) {
      const deadline = new Date(input.cancellationDeadline);
      if (deadline > serviceDate) {
        throw AppError.badRequest(
          "Cancellation deadline must be on or before service date",
        );
      }
    }

    if (input.itineraryDayId) {
      const day = await ItineraryRepository.findDayById(
        input.itineraryDayId,
        workspaceId,
      );
      if (!day || day.tripId !== existing.tripId) {
        throw AppError.badRequest("Itinerary day does not belong to this trip");
      }
    }

    const updated = await SupplierBookingRepository.update(
      bookingId,
      workspaceId,
      {
        ...(input.itineraryDayId !== undefined
          ? { itineraryDayId: input.itineraryDayId }
          : {}),
        ...(input.serviceType !== undefined
          ? { serviceType: input.serviceType }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.serviceDate !== undefined ? { serviceDate } : {}),
        ...(input.endDate !== undefined
          ? { endDate: input.endDate ? new Date(input.endDate) : null }
          : {}),
        ...(input.startTime !== undefined
          ? { startTime: input.startTime }
          : {}),
        ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
        ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.estimatedCost !== undefined
          ? { estimatedCost: input.estimatedCost }
          : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.cancellationPolicy !== undefined
          ? { cancellationPolicy: input.cancellationPolicy }
          : {}),
        ...(input.cancellationDeadline !== undefined
          ? {
              cancellationDeadline: input.cancellationDeadline
                ? new Date(input.cancellationDeadline)
                : null,
            }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.metadata !== undefined
          ? { metadata: input.metadata as Prisma.InputJsonValue }
          : {}),
      },
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier_booking.updated",
      entityType: "supplier_booking",
      entityId: bookingId,
      details: {
        changedFields: Object.keys(input),
      },
    });

    return toSupplierBookingDetail(updated);
  }

  static async requestQuote(
    workspaceId: string,
    userId: string,
    bookingId: string,
  ): Promise<SupplierBookingDetail> {
    const existing = await SupplierBookingRepository.findById(
      bookingId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Supplier booking not found");
    }
    if (existing.status !== "INQUIRY") {
      throw AppError.conflict(
        `Supplier booking must be in INQUIRY status to request quote, currently ${existing.status}`,
      );
    }

    const updated = await SupplierBookingRepository.updateStatus(
      bookingId,
      workspaceId,
      "REQUESTED",
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier_booking.requested",
      entityType: "supplier_booking",
      entityId: bookingId,
      details: { from: existing.status, to: "REQUESTED" },
    });

    return toSupplierBookingDetail(updated);
  }

  static async recordQuote(
    workspaceId: string,
    userId: string,
    bookingId: string,
    input: RecordSupplierQuoteInput,
  ): Promise<SupplierBookingDetail> {
    const existing = await SupplierBookingRepository.findById(
      bookingId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Supplier booking not found");
    }
    if (existing.status !== "REQUESTED") {
      throw AppError.conflict(
        `Supplier booking must be in REQUESTED status to record quote, currently ${existing.status}`,
      );
    }

    const updated = await SupplierBookingRepository.updateStatus(
      bookingId,
      workspaceId,
      "QUOTED",
      {
        confirmedCost: input.confirmedCost,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier_booking.quoted",
      entityType: "supplier_booking",
      entityId: bookingId,
      details: {
        confirmedCost: input.confirmedCost,
        from: existing.status,
        to: "QUOTED",
      },
    });

    return toSupplierBookingDetail(updated);
  }

  static async confirmBooking(
    workspaceId: string,
    userId: string,
    bookingId: string,
    input: ConfirmSupplierBookingInput,
  ): Promise<SupplierBookingDetail> {
    const existing = await SupplierBookingRepository.findById(
      bookingId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Supplier booking not found");
    }
    if (!["QUOTED", "BOOKED"].includes(existing.status)) {
      throw AppError.conflict(
        `Supplier booking must be in QUOTED or BOOKED status to confirm, currently ${existing.status}`,
      );
    }

    if (
      !input.confirmationNumber ||
      input.confirmationNumber.trim().length === 0
    ) {
      throw AppError.badRequest("Confirmation number is required");
    }

    const updated = await SupplierBookingRepository.updateStatus(
      bookingId,
      workspaceId,
      "CONFIRMED",
      {
        confirmationNumber: input.confirmationNumber,
        confirmedCost: input.confirmedCost,
        confirmedAt: new Date(),
        confirmedById: userId,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier_booking.confirmed",
      entityType: "supplier_booking",
      entityId: bookingId,
      details: {
        confirmationNumber: input.confirmationNumber,
        confirmedCost: input.confirmedCost,
        from: existing.status,
        to: "CONFIRMED",
      },
    });

    return toSupplierBookingDetail(updated);
  }

  static async markInProgress(
    workspaceId: string,
    userId: string,
    bookingId: string,
  ): Promise<SupplierBookingDetail> {
    const existing = await SupplierBookingRepository.findById(
      bookingId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Supplier booking not found");
    }
    if (existing.status !== "CONFIRMED") {
      throw AppError.conflict(
        `Supplier booking must be in CONFIRMED status to mark in progress, currently ${existing.status}`,
      );
    }

    const updated = await SupplierBookingRepository.updateStatus(
      bookingId,
      workspaceId,
      "IN_PROGRESS",
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier_booking.in_progress",
      entityType: "supplier_booking",
      entityId: bookingId,
      details: { from: existing.status, to: "IN_PROGRESS" },
    });

    return toSupplierBookingDetail(updated);
  }

  static async completeBooking(
    workspaceId: string,
    userId: string,
    bookingId: string,
  ): Promise<SupplierBookingDetail> {
    const existing = await SupplierBookingRepository.findById(
      bookingId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Supplier booking not found");
    }
    if (existing.status !== "IN_PROGRESS") {
      throw AppError.conflict(
        `Supplier booking must be in IN_PROGRESS status to complete, currently ${existing.status}`,
      );
    }

    const updated = await SupplierBookingRepository.updateStatus(
      bookingId,
      workspaceId,
      "COMPLETED",
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier_booking.completed",
      entityType: "supplier_booking",
      entityId: bookingId,
      details: { from: existing.status, to: "COMPLETED" },
    });

    return toSupplierBookingDetail(updated);
  }

  static async cancelBooking(
    workspaceId: string,
    userId: string,
    bookingId: string,
    input: CancelSupplierBookingInput,
  ): Promise<SupplierBookingDetail> {
    const existing = await SupplierBookingRepository.findById(
      bookingId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Supplier booking not found");
    }
    if (["COMPLETED", "CANCELLED"].includes(existing.status)) {
      throw AppError.conflict(
        `Cannot cancel a booking in status ${existing.status}`,
      );
    }

    const updated = await SupplierBookingRepository.cancel(
      bookingId,
      workspaceId,
      userId,
      input.reason,
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier_booking.cancelled",
      entityType: "supplier_booking",
      entityId: bookingId,
      details: {
        reason: input.reason,
        from: existing.status,
        to: "CANCELLED",
      },
    });

    return toSupplierBookingDetail(updated);
  }

  static async markNoShow(
    workspaceId: string,
    userId: string,
    bookingId: string,
  ): Promise<SupplierBookingDetail> {
    const existing = await SupplierBookingRepository.findById(
      bookingId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Supplier booking not found");
    }
    if (!["CONFIRMED", "IN_PROGRESS"].includes(existing.status)) {
      throw AppError.conflict(
        `Booking must be CONFIRMED or IN_PROGRESS to mark no-show, currently ${existing.status}`,
      );
    }

    const updated = await SupplierBookingRepository.updateStatus(
      bookingId,
      workspaceId,
      "NO_SHOW",
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier_booking.no_show",
      entityType: "supplier_booking",
      entityId: bookingId,
      details: { from: existing.status, to: "NO_SHOW" },
    });

    return toSupplierBookingDetail(updated);
  }

  static async recordActualCost(
    workspaceId: string,
    userId: string,
    bookingId: string,
    input: RecordSupplierBookingActualCostInput,
  ): Promise<SupplierBookingDetail> {
    const existing = await SupplierBookingRepository.findById(
      bookingId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Supplier booking not found");
    }
    if (!["IN_PROGRESS", "COMPLETED"].includes(existing.status)) {
      throw AppError.conflict(
        `Actual cost can only be recorded when booking is IN_PROGRESS or COMPLETED, currently ${existing.status}`,
      );
    }

    const updated = await SupplierBookingRepository.recordActualCost(
      bookingId,
      workspaceId,
      input.actualCost,
      input.notes,
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier_booking.actual_cost_recorded",
      entityType: "supplier_booking",
      entityId: bookingId,
      details: {
        actualCost: input.actualCost,
      },
    });

    return toSupplierBookingDetail(updated);
  }

  static async deleteBooking(
    workspaceId: string,
    userId: string,
    bookingId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await SupplierBookingRepository.findById(
      bookingId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Supplier booking not found");
    }

    await SupplierBookingRepository.softDelete(bookingId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier_booking.deleted",
      entityType: "supplier_booking",
      entityId: bookingId,
      details: {
        tripId: existing.tripId,
        supplierId: existing.supplierId,
      },
    });

    return { success: true, id: bookingId };
  }

  static async getUpcomingDeadlines(
    workspaceId: string,
    withinHours = 72,
  ): Promise<SupplierBookingDetail[]> {
    const bookings =
      await SupplierBookingRepository.findUpcomingCancellationDeadlines(
        workspaceId,
        withinHours,
      );
    return bookings.map(toSupplierBookingDetail);
  }

  static async listByTrip(
    workspaceId: string,
    tripId: string,
  ): Promise<SupplierBookingDetail[]> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }
    const bookings = await SupplierBookingRepository.findByTrip(
      tripId,
      workspaceId,
    );
    return bookings.map(toSupplierBookingDetail);
  }

  static async listBySupplier(
    workspaceId: string,
    supplierId: string,
  ): Promise<SupplierBookingDetail[]> {
    const supplier = await SupplierRepository.findById(supplierId, workspaceId);
    if (!supplier) {
      throw AppError.notFound("Supplier not found in this workspace");
    }
    const bookings = await SupplierBookingRepository.findBySupplier(
      supplierId,
      workspaceId,
    );
    return bookings.map(toSupplierBookingDetail);
  }
}
