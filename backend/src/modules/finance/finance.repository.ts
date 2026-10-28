import { prisma } from "../../lib/prisma.js";

/**
 * Finance owns no tables. Every number is read from the modules that already
 * record money: bookings, supplier bookings, staff assignments and recovery plans.
 *
 * Cancelled supplier bookings are excluded from both estimate and actual cost —
 * a cancelled reservation is not a cost the agency carried. Staff assignments
 * exclude DECLINED and CANCELLED for the same reason.
 */
export const CANCELLED_SUPPLIER_BOOKING_STATUSES = [
  "CANCELLED",
  "NO_SHOW",
] as const;
export const EXCLUDED_STAFF_ASSIGNMENT_STATUSES = [
  "DECLINED",
  "CANCELLED",
] as const;

const SUPPLIER_BOOKING_SELECT = {
  estimatedCost: true,
  confirmedCost: true,
  actualCost: true,
  currency: true,
  serviceType: true,
} as const;

const STAFF_ASSIGNMENT_SELECT = {
  role: true,
  agreedRate: true,
  currency: true,
  status: true,
} as const;

const RECOVERY_PLAN_SELECT = {
  estimatedCost: true,
  status: true,
} as const;

export class FinanceRepository {
  static async findTrip(workspaceId: string, tripId: string) {
    return prisma.trip.findFirst({
      where: { id: tripId, workspaceId, deletedAt: null },
      select: {
        id: true,
        workspaceId: true,
        tripNumber: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        bookingId: true,
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            currency: true,
            status: true,
          },
        },
      },
    });
  }

  static async listSupplierBookings(workspaceId: string, tripId: string) {
    return prisma.supplierBooking.findMany({
      where: {
        workspaceId,
        tripId,
        deletedAt: null,
        status: { notIn: [...CANCELLED_SUPPLIER_BOOKING_STATUSES] },
      },
      select: SUPPLIER_BOOKING_SELECT,
    });
  }

  static async listStaffAssignments(workspaceId: string, tripId: string) {
    return prisma.staffAssignment.findMany({
      where: {
        workspaceId,
        tripId,
        deletedAt: null,
        status: { notIn: [...EXCLUDED_STAFF_ASSIGNMENT_STATUSES] },
      },
      select: STAFF_ASSIGNMENT_SELECT,
    });
  }

  /** Recovery spend lives on the plan; individual tasks carry no money of their own. */
  static async listRecoveryPlans(workspaceId: string, tripId: string) {
    return prisma.recoveryPlan.findMany({
      where: { disruption: { workspaceId, tripId } },
      select: RECOVERY_PLAN_SELECT,
    });
  }

  /** Every non-deleted trip plus its booking and the cost rows needed for the summary. */
  static async listTripsWithCosts(workspaceId: string) {
    return prisma.trip.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: [{ startDate: "desc" }, { tripNumber: "asc" }],
      select: {
        id: true,
        tripNumber: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        booking: {
          select: {
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            currency: true,
          },
        },
        supplierBookings: {
          where: {
            deletedAt: null,
            status: { notIn: [...CANCELLED_SUPPLIER_BOOKING_STATUSES] },
          },
          select: SUPPLIER_BOOKING_SELECT,
        },
        staffAssignments: {
          where: {
            deletedAt: null,
            status: { notIn: [...EXCLUDED_STAFF_ASSIGNMENT_STATUSES] },
          },
          select: STAFF_ASSIGNMENT_SELECT,
        },
        disruptions: {
          select: {
            recoveryPlan: { select: RECOVERY_PLAN_SELECT },
          },
        },
      },
    });
  }
}

export type FinanceRepositoryTrip = NonNullable<
  Awaited<ReturnType<typeof FinanceRepository.findTrip>>
>;
