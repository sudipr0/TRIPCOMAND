import { prisma } from "../../lib/prisma.js";
import {
  CANCELLED_SUPPLIER_BOOKING_STATUSES,
  EXCLUDED_STAFF_ASSIGNMENT_STATUSES,
} from "../finance/finance.repository.js";

/**
 * Analytics owns no tables. It reads the same operational records Finance
 * summarises, with one difference: every query here is bounded by a reporting
 * period, and every row that carries money carries its own currency so the
 * service can keep currency buckets apart.
 */

/** Disruption statuses that still need operational attention. */
export const OPEN_DISRUPTION_STATUSES = [
  "REPORTED",
  "ASSESSING",
  "PLANNED",
  "AWAITING_APPROVAL",
  "EXECUTING",
] as const;

/** Recovery plan statuses whose cost is treated as recorded spend (not a draft). */
export const RECORDED_RECOVERY_STATUSES = ["APPROVED", "EXECUTING", "COMPLETED"] as const;

const MONEY_SELECT = {
  estimatedCost: true,
  confirmedCost: true,
  actualCost: true,
  currency: true,
} as const;

/**
 * One booking carrying revenue in the reporting period.
 *
 * Revenue is read from `Booking`, not `Trip`, so a trip that starts next year
 * cannot contribute this year's revenue and a trip with no booking contributes
 * nothing at all.
 */
export interface AnalyticsRevenueRow {
  tripId: string | null;
  bookingNumber: string;
  currency: string;
  status: string;
  totalAmount: { toString(): string };
  createdAt: Date;
  /**
   * Refund payments recorded against this booking inside the reporting window.
   * A refund is the only reversal this schema has (there is no credit note or
   * void), so it is what gets netted off recognised revenue.
   */
  refundedAmount?: number;
}

export interface AnalyticsTripRow {
  id: string;
  tripNumber: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date;
  booking: {
    totalAmount: { toString(): string };
    currency: string;
    status: string;
  } | null;
  supplierBookings: {
    estimatedCost: { toString(): string } | null;
    confirmedCost: { toString(): string } | null;
    actualCost: { toString(): string } | null;
    currency: string;
    status: string;
    serviceDate: Date;
    supplierId: string;
  }[];
  staffAssignments: {
    agreedRate: { toString(): string } | null;
    currency: string;
    status: string;
  }[];
  disruptions: {
    id: string;
    status: string;
    category: string;
    severity: string;
    reportedAt: Date;
    resolvedAt: Date | null;
    closedAt: Date | null;
    recoveryPlan: {
      status: string;
      estimatedCost: { toString(): string } | null;
      tasks: { status: string; completedAt: Date | null }[];
    } | null;
  }[];
}

export class AnalyticsRepository {
  /**
   * Every non-deleted trip whose start date falls in [from, to), with the rows
   * needed to price it. One query, nested selects — no per-trip follow-up.
   */
  static async listTripsInPeriod(
    workspaceId: string,
    from: Date,
    to: Date,
    status?: string,
  ): Promise<AnalyticsTripRow[]> {
    return prisma.trip.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        startDate: { gte: from, lt: to },
        ...(status ? { status: status as never } : {}),
      },
      orderBy: [{ startDate: "asc" }, { tripNumber: "asc" }],
      select: {
        id: true,
        tripNumber: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        booking: {
          select: { totalAmount: true, currency: true, status: true },
        },
        supplierBookings: {
          where: { deletedAt: null },
          select: {
            ...MONEY_SELECT,
            status: true,
            serviceDate: true,
            supplierId: true,
          },
        },
        staffAssignments: {
          where: {
            deletedAt: null,
            status: { notIn: [...EXCLUDED_STAFF_ASSIGNMENT_STATUSES] },
          },
          select: { agreedRate: true, currency: true, status: true },
        },
        disruptions: {
          select: {
            id: true,
            status: true,
            category: true,
            severity: true,
            reportedAt: true,
            resolvedAt: true,
            closedAt: true,
            recoveryPlan: {
              select: {
                status: true,
                estimatedCost: true,
                tasks: { select: { status: true, completedAt: true } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Bookings confirmed inside [from, to) for trips in this workspace.
   *
   * The window is the booking's confirmation date (falling back to its creation
   * date when it was never confirmed), so revenue is recognised when the agency
   * took the booking, not when the trek departs. Cancelled and refunded bookings
   * are returned too: the service decides what to do with them rather than
   * hiding them here.
   */
  static async listRevenueBookingsInPeriod(
    workspaceId: string,
    from: Date,
    to: Date,
  ): Promise<AnalyticsRevenueRow[]> {
    const rows = await prisma.booking.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        status: { not: "CANCELLED" },
        OR: [
          { confirmedAt: { gte: from, lt: to } },
          { confirmedAt: null, createdAt: { gte: from, lt: to } },
        ],
      },
      select: {
        bookingNumber: true,
        currency: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        confirmedAt: true,
        trip: { select: { id: true } },
        // Refunds received in the same window, joined in one query rather than
        // fetched per booking.
        payments: {
          where: { paymentType: "REFUND", receivedAt: { gte: from, lt: to } },
          select: { amount: true },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });
    return rows.map((row) => ({
      tripId: row.trip?.id ?? null,
      bookingNumber: row.bookingNumber,
      currency: row.currency,
      status: row.status,
      totalAmount: row.totalAmount,
      createdAt: row.confirmedAt ?? row.createdAt,
      refundedAmount: row.payments.reduce(
        (sum, payment) => sum + Math.abs(Number(payment.amount.toString())),
        0,
      ),
    }));
  }

  /**
   * Disruptions reported in [from, to). Supplier attribution is read from the
   * explicit `supplierId` an impact assessment already carries — nothing here
   * guesses that a disruption belongs to every supplier on the trip.
   */
  static async listDisruptionsInPeriod(workspaceId: string, from: Date, to: Date) {
    return prisma.disruption.findMany({
      where: {
        workspaceId,
        trip: { deletedAt: null },
        reportedAt: { gte: from, lt: to },
      },
      select: {
        id: true,
        tripId: true,
        status: true,
        category: true,
        severity: true,
        reportedAt: true,
        resolvedAt: true,
        closedAt: true,
        impacts: {
          where: { entityType: "supplier" },
          select: { entityId: true, entityName: true },
        },
        recoveryPlan: {
          select: {
            status: true,
            estimatedCost: true,
            tasks: { select: { status: true } },
          },
        },
      },
    });
  }

  /**
   * Open disruptions for trips that are not themselves cancelled. Deliberately
   * not bounded by the reporting year: an incident opened before the period is
   * still an active disruption today.
   */
  static async countActiveDisruptions(workspaceId: string) {
    return prisma.disruption.count({
      where: {
        workspaceId,
        status: { in: [...OPEN_DISRUPTION_STATUSES] },
        trip: { deletedAt: null, status: { not: "CANCELLED" } },
      },
    });
  }

  /**
   * Supplier bookings in the period for every supplier that has any booking at
   * all, so a supplier with zero bookings in the window can be reported as such
   * rather than silently omitted.
   */
  static async listSuppliersForReliability(workspaceId: string, from: Date, to: Date) {
    const [suppliers, bookings] = await Promise.all([
      prisma.supplier.findMany({
        where: { workspaceId, deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, category: true, status: true, currency: true },
      }),
      prisma.supplierBooking.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          serviceDate: { gte: from, lt: to },
        },
        select: {
          id: true,
          supplierId: true,
          tripId: true,
          status: true,
          ...MONEY_SELECT,
        },
      }),
    ]);
    return { suppliers, bookings };
  }
}

export type AnalyticsDisruptionRow = Awaited<
  ReturnType<typeof AnalyticsRepository.listDisruptionsInPeriod>
>[number];
