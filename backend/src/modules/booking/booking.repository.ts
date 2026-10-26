import type { Prisma } from "@prisma/client";
import type { ListBookingsQuery } from "@trailcomand/shared";

import { prisma } from "../../lib/prisma.js";

type BookingInclude = { payments: true };

export class BookingRepository {
  /**
   * List bookings scoped to a workspace.
   * Every query filters by workspaceId to enforce tenancy.
   */
  static async listBookings(
    workspaceId: string,
    filter: ListBookingsQuery,
  ): Promise<{ total: number; items: Prisma.BookingGetPayload<object>[] }> {
    const where: Prisma.BookingWhereInput = {
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
              {
                bookingNumber: {
                  contains: filter.search,
                  mode: "insensitive",
                },
              },
              { trekName: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filter.limit,
        skip: filter.offset,
      }),
    ]);
    return { total, items };
  }

  static async findById(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.BookingGetPayload<{ include: BookingInclude }> | null> {
    return prisma.booking.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: { payments: { orderBy: { createdAt: "desc" } } },
    });
  }

  /**
   * Generate the next booking number: BKG-YYYY-NNN.
   */
  static async generateNumber(
    workspaceId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BKG-${year}-`;
    const rows = await prisma.$queryRaw<{ maxnum: number | null }[]>`
      SELECT MAX(CAST(SUBSTRING(booking_number FROM 'BKG-[0-9]+-([0-9]+)') AS INT)) AS maxnum
      FROM bookings
      WHERE workspace_id = ${workspaceId}
        AND booking_number LIKE ${prefix + '%'}
    `;
    const next = (rows[0]?.maxnum ?? 0) + 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  static async create(
    workspaceId: string,
    data: {
      customerId: string;
      quotationId?: string | null;
      bookingNumber: string;
      trekName: string;
      startDate: Date;
      endDate: Date;
      groupSize: number;
      totalAmount: number;
      paidAmount: number;
      balanceAmount: number;
      currency: string;
      status: string;
      confirmedAt?: Date | null;
    },
  ): Promise<Prisma.BookingGetPayload<{ include: BookingInclude }>> {
    return prisma.booking.create({
      data: {
        workspaceId,
        customerId: data.customerId,
        quotationId: data.quotationId ?? null,
        bookingNumber: data.bookingNumber,
        trekName: data.trekName,
        startDate: data.startDate,
        endDate: data.endDate,
        groupSize: data.groupSize,
        totalAmount: data.totalAmount,
        paidAmount: data.paidAmount,
        balanceAmount: data.balanceAmount,
        currency: data.currency,
        status: data.status as never,
        confirmedAt: data.confirmedAt ?? null,
      },
      include: { payments: { orderBy: { createdAt: "desc" } } },
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.BookingUpdateInput,
  ): Promise<Prisma.BookingGetPayload<{ include: BookingInclude }>> {
    return prisma.booking.update({
      where: { id },
      data,
      include: { payments: { orderBy: { createdAt: "desc" } } },
    });
  }

  static async updateStatus(
    id: string,
    workspaceId: string,
    status: string,
    extra?: Prisma.BookingUpdateInput,
  ): Promise<Prisma.BookingGetPayload<{ include: BookingInclude }>> {
    return prisma.booking.update({
      where: { id },
      data: { status: status as never, ...extra },
      include: { payments: { orderBy: { createdAt: "desc" } } },
    });
  }

  static async softDelete(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.BookingGetPayload<{ include: BookingInclude }>> {
    return prisma.booking.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: { payments: { orderBy: { createdAt: "desc" } } },
    });
  }

  static async findByQuotation(
    quotationId: string,
    workspaceId: string,
  ): Promise<Prisma.BookingGetPayload<{ include: BookingInclude }> | null> {
    return prisma.booking.findFirst({
      where: { quotationId, workspaceId, deletedAt: null },
      include: { payments: { orderBy: { createdAt: "desc" } } },
    });
  }
}
