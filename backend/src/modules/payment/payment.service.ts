import type { Prisma } from "@prisma/client";
import { PaymentRepository } from "./payment.repository.js";
import { BookingRepository } from "../booking/booking.repository.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import type {
  CreatePaymentInput,
  ListPaymentsQuery,
  PaymentDetail,
  ListPaymentsResult,
  BookingDetail,
} from "@trailcomand/shared";

function toPaymentDetail(
  payment: Prisma.PaymentGetPayload<object>,
): PaymentDetail {
  return {
    id: payment.id,
    workspaceId: payment.workspaceId,
    bookingId: payment.bookingId,
    amount: payment.amount.toString(),
    currency: payment.currency,
    paymentType: payment.paymentType,
    method: payment.method,
    reference: payment.reference,
    receivedAt: payment.receivedAt.toISOString(),
    recordedById: payment.recordedById,
    evidence: payment.evidence,
    notes: payment.notes,
    createdAt: payment.createdAt.toISOString(),
  };
}

function toBookingSummary(
  booking: Prisma.BookingGetPayload<{ include: { payments: true } }>,
): Pick<
  BookingDetail,
  "id" | "paidAmount" | "balanceAmount" | "totalAmount" | "status"
> {
  return {
    id: booking.id,
    paidAmount: booking.paidAmount.toString(),
    balanceAmount: booking.balanceAmount.toString(),
    totalAmount: booking.totalAmount.toString(),
    status: booking.status,
  };
}

export class PaymentService {
  static async listPayments(
    workspaceId: string,
    filter: ListPaymentsQuery,
  ): Promise<ListPaymentsResult> {
    const { total, items } = await PaymentRepository.listPayments(
      workspaceId,
      filter,
    );
    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map(toPaymentDetail),
    };
  }

  static async getPayment(
    workspaceId: string,
    paymentId: string,
  ): Promise<PaymentDetail> {
    const payment = await PaymentRepository.findById(paymentId, workspaceId);
    if (!payment) {
      throw AppError.notFound("Payment not found");
    }
    return toPaymentDetail(payment);
  }

  static async recordPayment(
    workspaceId: string,
    userId: string,
    bookingId: string,
    input: CreatePaymentInput,
  ): Promise<{ payment: PaymentDetail; booking: BookingDetail }> {
    const booking = await BookingRepository.findById(bookingId, workspaceId);
    if (!booking) {
      throw AppError.notFound("Booking not found in this workspace");
    }
    if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
      throw AppError.conflict(
        `Cannot record payments for a ${booking.status} booking`,
      );
    }

    // REFUND amounts are stored positive but subtract from paidAmount.
    const effectiveAmount =
      input.paymentType === "REFUND" ? -Math.abs(input.amount) : input.amount;

    const payment = await PaymentRepository.create(workspaceId, {
      bookingId,
      amount: Math.abs(input.amount),
      currency: input.currency ?? "NPR",
      paymentType: input.paymentType,
      method: input.method ?? null,
      reference: input.reference ?? null,
      receivedAt: new Date(input.receivedAt),
      recordedById: userId,
      evidence: input.evidence ?? null,
      notes: input.notes ?? null,
    });

    // Recalculate paid/balance from all payments for this booking.
    const { paid, refunded } = await PaymentRepository.sumForBooking(
      bookingId,
      workspaceId,
    );
    const paidAmount = paid - refunded;
    const totalAmount = Number(booking.totalAmount);
    const balanceAmount = totalAmount - paidAmount;

    const updatedBooking = await BookingRepository.update(
      bookingId,
      workspaceId,
      {
        paidAmount,
        balanceAmount,
      } as Prisma.BookingUpdateInput,
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "payment.recorded",
      entityType: "payment",
      entityId: payment.id,
      details: {
        bookingId,
        bookingNumber: booking.bookingNumber,
        amount: input.amount,
        paymentType: input.paymentType,
        paidAmount,
        balanceAmount,
      },
    });

    return {
      payment: toPaymentDetail(payment),
      booking: toBookingSummary(updatedBooking) as BookingDetail,
    };
  }
}
