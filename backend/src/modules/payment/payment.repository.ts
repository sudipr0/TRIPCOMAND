import type { Prisma } from "@prisma/client";
import type { ListPaymentsQuery } from "@tripchange/shared";
import { prisma } from "../../lib/prisma.js";

export class PaymentRepository {
  /**
   * List payments scoped to a workspace.
   * Every query filters by workspaceId to enforce tenancy.
   */
  static async listPayments(
    workspaceId: string,
    filter: ListPaymentsQuery,
  ): Promise<{ total: number; items: Prisma.PaymentGetPayload<object>[] }> {
    const where: Prisma.PaymentWhereInput = {
      workspaceId,
      ...(filter.bookingId ? { bookingId: filter.bookingId } : {}),
      ...(filter.fromDate || filter.toDate
        ? {
            receivedAt: {
              ...(filter.fromDate ? { gte: new Date(filter.fromDate) } : {}),
              ...(filter.toDate ? { lte: new Date(filter.toDate) } : {}),
            },
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        take: filter.limit,
        skip: filter.offset,
      }),
    ]);
    return { total, items };
  }

  static async findById(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.PaymentGetPayload<object> | null> {
    return prisma.payment.findFirst({
      where: { id, workspaceId },
    });
  }

  static async create(
    workspaceId: string,
    data: {
      bookingId: string;
      amount: number;
      currency: string;
      paymentType: string;
      method?: string | null;
      reference?: string | null;
      receivedAt: Date;
      recordedById?: string | null;
      evidence?: string | null;
      notes?: string | null;
    },
  ): Promise<Prisma.PaymentGetPayload<object>> {
    return prisma.payment.create({
      data: {
        workspaceId,
        bookingId: data.bookingId,
        amount: data.amount,
        currency: data.currency,
        paymentType: data.paymentType as never,
        method: data.method ?? null,
        reference: data.reference ?? null,
        receivedAt: data.receivedAt,
        recordedById: data.recordedById ?? null,
        evidence: data.evidence ?? null,
        notes: data.notes ?? null,
      },
    });
  }

  /**
   * Aggregate payment sums for a booking.
   * paid = SUM(non-REFUND amounts) - SUM(REFUND amounts)
   */
  static async sumForBooking(
    bookingId: string,
    workspaceId: string,
  ): Promise<{ paid: number; refunded: number }> {
    const rows = await prisma.payment.groupBy({
      by: ["paymentType"],
      where: { bookingId, workspaceId },
      _sum: { amount: true },
    });
    let paid = 0;
    let refunded = 0;
    for (const row of rows) {
      const sum = Number(row._sum.amount ?? 0);
      if (row.paymentType === "REFUND") {
        refunded += sum;
      } else {
        paid += sum;
      }
    }
    return { paid, refunded };
  }
}
