import type { Prisma } from "@prisma/client";
import type { UpdateBookingInput, ListBookingsQuery } from '@trailcomand/shared';
import type { BookingDetail, ListBookingsResult, TripDetail } from '@trailcomand/shared';

import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import { TripService } from "../trip/trip.service.js";
import { BookingRepository } from "./booking.repository.js";
import { QuotationRepository } from "../quotation/quotation.repository.js";

type QuotationWithRelations = NonNullable<
  Awaited<ReturnType<typeof QuotationRepository.findById>>
>;

function toBookingDetail(
  booking: Prisma.BookingGetPayload<{ include: { payments: true } }>,
): BookingDetail {
  return {
    id: booking.id,
    workspaceId: booking.workspaceId,
    customerId: booking.customerId,
    quotationId: booking.quotationId,
    bookingNumber: booking.bookingNumber,
    trekName: booking.trekName,
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    groupSize: booking.groupSize,
    totalAmount: booking.totalAmount.toString(),
    paidAmount: booking.paidAmount.toString(),
    balanceAmount: booking.balanceAmount.toString(),
    currency: booking.currency,
    status: booking.status,
    confirmedAt: booking.confirmedAt ? booking.confirmedAt.toISOString() : null,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
    cancellationReason: booking.cancellationReason,
    payments: booking.payments
      ? booking.payments.map((p) => ({
          id: p.id,
          workspaceId: p.workspaceId,
          bookingId: p.bookingId,
          amount: p.amount.toString(),
          currency: p.currency,
          paymentType: p.paymentType,
          method: p.method,
          reference: p.reference,
          receivedAt: p.receivedAt.toISOString(),
          recordedById: p.recordedById,
          evidence: p.evidence,
          notes: p.notes,
          createdAt: p.createdAt.toISOString(),
        }))
      : undefined,
    metadata: booking.metadata,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    deletedAt: booking.deletedAt ? booking.deletedAt.toISOString() : null,
  };
}

export class BookingService {
  static async listBookings(
    workspaceId: string,
    filter: ListBookingsQuery,
  ): Promise<ListBookingsResult> {
    const { total, items } = await BookingRepository.listBookings(
      workspaceId,
      filter,
    );
    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map((b) =>
        toBookingDetail(b as Prisma.BookingGetPayload<{ include: { payments: true } }> & { payments: [] }),
      ),
    };
  }

  static async getBooking(
    workspaceId: string,
    bookingId: string,
  ): Promise<BookingDetail> {
    const booking = await BookingRepository.findById(bookingId, workspaceId);
    if (!booking) {
      throw AppError.notFound("Booking not found");
    }
    return toBookingDetail(booking);
  }

  static async createFromQuotation(
    workspaceId: string,
    userId: string,
    quotationId: string,
  ): Promise<{ booking: BookingDetail; trip: TripDetail }> {
    const quotation = (await QuotationRepository.findById(
      quotationId,
      workspaceId,
    )) as QuotationWithRelations | null;
    if (!quotation) {
      throw AppError.notFound("Quotation not found in this workspace");
    }
    if (quotation.status !== "ACCEPTED") {
      throw AppError.conflict(
        "Only ACCEPTED quotations can be converted to a booking",
      );
    }
    if (quotation.convertedToBookingId) {
      throw AppError.conflict(
        "Quotation has already been converted to a booking",
      );
    }

    const existing = await BookingRepository.findByQuotation(
      quotationId,
      workspaceId,
    );
    if (existing) {
      throw AppError.conflict(
        "A booking already exists for this quotation",
      );
    }

    const bookingNumber = await BookingRepository.generateNumber(workspaceId);
    const totalAmount = Number(quotation.total);
    const created = await BookingRepository.create(workspaceId, {
      customerId: quotation.customerId,
      quotationId,
      bookingNumber,
      trekName: quotation.trekName,
      startDate: quotation.startDate,
      endDate: quotation.endDate,
      groupSize: quotation.groupSize,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      currency: quotation.currency,
      status: "CONFIRMED",
      confirmedAt: new Date(),
    });

    // Auto-create the trip skeleton for the new booking.
    // Chosen approach: separate follow-up call after the booking is created.
    // Rationale: BookingRepository.create is not transactional, so wrapping the
    // trip insert in the same transaction would require restructuring Phase 3
    // code; the trip can always be created manually if the auto-step fails.
    const trip = await TripService.createTripFromBooking(
      workspaceId,
      userId,
      created,
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "booking.created_from_quotation",
      entityType: "booking",
      entityId: created.id,
      details: { bookingNumber, quotationId, totalAmount },
    });

    return { booking: toBookingDetail(created), trip };
  }

  static async updateBooking(
    workspaceId: string,
    bookingId: string,
    userId: string,
    input: UpdateBookingInput,
  ): Promise<BookingDetail> {
    const existing = await BookingRepository.findById(bookingId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Booking not found");
    }

    const updateData: Prisma.BookingUpdateInput = {};
    if (input.trekName !== undefined) updateData.trekName = input.trekName;
    if (input.startDate !== undefined)
      updateData.startDate = new Date(input.startDate);
    if (input.endDate !== undefined)
      updateData.endDate = new Date(input.endDate);
    if (input.groupSize !== undefined)
      updateData.groupSize = input.groupSize;

    const updated = await BookingRepository.update(
      bookingId,
      workspaceId,
      updateData,
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "booking.updated",
      entityType: "booking",
      entityId: bookingId,
      details: {
        bookingNumber: existing.bookingNumber,
        changedFields: Object.keys(input),
      },
    });

    return toBookingDetail(updated);
  }

  static async deleteBooking(
    workspaceId: string,
    bookingId: string,
    userId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await BookingRepository.findById(bookingId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Booking not found");
    }

    await BookingRepository.softDelete(bookingId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "booking.deleted",
      entityType: "booking",
      entityId: bookingId,
      details: { bookingNumber: existing.bookingNumber },
    });

    return { success: true, id: bookingId };
  }

  static async cancelBooking(
    workspaceId: string,
    bookingId: string,
    userId: string,
    reason: string,
  ): Promise<BookingDetail> {
    const existing = await BookingRepository.findById(bookingId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Booking not found");
    }
    if (
      existing.status === "CANCELLED" ||
      existing.status === "COMPLETED" ||
      existing.status === "REFUNDED"
    ) {
      throw AppError.conflict(
        `Booking in status ${existing.status} cannot be cancelled`,
      );
    }

    const updated = await BookingRepository.updateStatus(
      bookingId,
      workspaceId,
      "CANCELLED",
      { cancelledAt: new Date(), cancellationReason: reason },
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "booking.cancelled",
      entityType: "booking",
      entityId: bookingId,
      details: { bookingNumber: existing.bookingNumber, reason },
    });

    return toBookingDetail(updated);
  }

  static async completeBooking(
    workspaceId: string,
    bookingId: string,
    userId: string,
  ): Promise<BookingDetail> {
    const existing = await BookingRepository.findById(bookingId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Booking not found");
    }
    if (
      existing.status === "CANCELLED" ||
      existing.status === "COMPLETED" ||
      existing.status === "REFUNDED"
    ) {
      throw AppError.conflict(
        `Booking in status ${existing.status} cannot be completed`,
      );
    }

    const updated = await BookingRepository.updateStatus(
      bookingId,
      workspaceId,
      "COMPLETED",
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "booking.completed",
      entityType: "booking",
      entityId: bookingId,
      details: { bookingNumber: existing.bookingNumber },
    });

    return toBookingDetail(updated);
  }
}
