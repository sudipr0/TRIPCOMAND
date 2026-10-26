import type { TripProfitabilityRow } from '@trailcomand/shared';
import type { TripFinancialsResponse } from '@trailcomand/shared';
import type { WorkspaceFinancialSummary } from '@trailcomand/shared';
import type { CostBreakdownItem, MarginBand } from '@trailcomand/shared';
import { FINANCE_HEALTHY_MARGIN_PERCENT, FINANCE_LOW_MARGIN_PERCENT } from "@trailcomand/shared";

import { AppError } from "../../lib/errors.js";
import { FinanceRepository } from "./finance.repository.js";

type MoneyInput = { toString(): string } | number | null | undefined;
type SupplierCostRow = {
  estimatedCost: MoneyInput;
  confirmedCost: MoneyInput;
  actualCost: MoneyInput;
  currency: string;
};
type StaffCostRow = { agreedRate: MoneyInput; currency: string; status: string };
type RecoveryPlanRow = { estimatedCost: MoneyInput; status: string };

const DEFAULT_CURRENCY = "NPR";
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Prisma Decimal, number or null/undefined -> plain number. */
export function money(value: MoneyInput): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Best known actual figure: actual > confirmed > estimated. */
export function effectiveSupplierCost(row: SupplierCostRow): number {
  const actual = money(row.actualCost);
  if (actual > 0) return actual;
  const confirmed = money(row.confirmedCost);
  if (confirmed > 0) return confirmed;
  return money(row.estimatedCost);
}

/** Budgeted figure: estimated > confirmed (a quote may arrive without an estimate). */
export function estimatedSupplierCost(row: SupplierCostRow): number {
  const estimated = money(row.estimatedCost);
  if (estimated > 0) return estimated;
  return money(row.confirmedCost);
}

export function percentOf(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return round2((part / whole) * 100);
}

export function marginBandFor(marginPercent: number, totalRevenue: number): MarginBand {
  if (totalRevenue <= 0) return "NO_REVENUE";
  if (marginPercent >= FINANCE_HEALTHY_MARGIN_PERCENT) return "HEALTHY";
  if (marginPercent >= FINANCE_LOW_MARGIN_PERCENT) return "WARNING";
  return "CRITICAL";
}

/** Pick the currency used by the most rows, falling back to the booking then NPR. */
function dominantCurrency(rows: { currency: string }[], fallback?: string | null): string {
  if (!rows.length) return fallback || DEFAULT_CURRENCY;
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.currency, (counts.get(row.currency) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

export interface CostTotals {
  estimatedCost: number;
  actualCost: number;
  suppliers: number;
  staff: number;
  recovery: number;
}

/**
 * Sums the three cost sources. Recovery plans only count when they represent
 * real spend: approved (has an approver) or already in execution/closed out.
 */
export function sumCosts(
  supplierBookings: SupplierCostRow[],
  staffAssignments: StaffCostRow[],
  recoveryPlans: RecoveryPlanRow[] = [],
): CostTotals {
  const suppliers = supplierBookings.reduce((sum, row) => sum + effectiveSupplierCost(row), 0);
  const suppliersEstimated = supplierBookings.reduce((sum, row) => sum + estimatedSupplierCost(row), 0);
  const staff = staffAssignments.reduce((sum, row) => sum + money(row.agreedRate), 0);
  const recovery = recoveryPlans
    .filter((plan) => plan.status !== "DRAFT")
    .reduce((sum, plan) => sum + money(plan.estimatedCost), 0);

  return {
    // Staff rates are agreed up front, so they are both the estimate and the actual.
    estimatedCost: round2(suppliersEstimated + staff),
    actualCost: round2(suppliers + staff + recovery),
    suppliers: round2(suppliers),
    staff: round2(staff),
    recovery: round2(recovery),
  };
}

export function buildBreakdown(totals: CostTotals): CostBreakdownItem[] {
  const items: CostBreakdownItem[] = [
    { category: "Suppliers", amount: totals.suppliers, percent: percentOf(totals.suppliers, totals.actualCost) },
    { category: "Staff", amount: totals.staff, percent: percentOf(totals.staff, totals.actualCost) },
  ];
  if (totals.recovery > 0) {
    items.push({
      category: "Recovery",
      amount: totals.recovery,
      percent: percentOf(totals.recovery, totals.actualCost),
    });
  }
  return items;
}

export interface ProfitabilityInput {
  revenue: number;
  totals: CostTotals;
}

export function profitability({ revenue, totals }: ProfitabilityInput) {
  const grossProfit = round2(revenue - totals.actualCost);
  const marginPercent = revenue > 0 ? percentOf(grossProfit, revenue) : 0;
  return {
    grossProfit,
    marginPercent,
    marginBand: marginBandFor(marginPercent, revenue),
  };
}

type SummaryTripRow = {
  id: string;
  tripNumber: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date;
  booking: { totalAmount: MoneyInput; paidAmount: MoneyInput; balanceAmount: MoneyInput; currency: string } | null;
  supplierBookings: SupplierCostRow[];
  staffAssignments: StaffCostRow[];
  disruptions: { recoveryPlan: RecoveryPlanRow | null }[];
};

export function toProfitabilityRow(trip: SummaryTripRow): TripProfitabilityRow {
  const revenue = money(trip.booking?.totalAmount);
  const totals = sumCosts(
    trip.supplierBookings,
    trip.staffAssignments,
    trip.disruptions.flatMap((disruption) => (disruption.recoveryPlan ? [disruption.recoveryPlan] : [])),
  );
  const metrics = profitability({ revenue, totals });
  return {
    tripId: trip.id,
    tripNumber: trip.tripNumber,
    name: trip.name,
    status: trip.status,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    totalRevenue: round2(revenue),
    totalCost: totals.actualCost,
    grossProfit: metrics.grossProfit,
    marginPercent: metrics.marginPercent,
    marginBand: metrics.marginBand,
  };
}

export class FinanceService {
  /**
   * Every figure is derived on read. Nothing is persisted, so finance can never
   * drift from the operational records it summarises.
   */
  static async calculateTripFinancials(
    workspaceId: string,
    tripId: string,
  ): Promise<TripFinancialsResponse> {
    const trip = await FinanceRepository.findTrip(workspaceId, tripId);
    if (!trip) {
      throw AppError.notFound("Trip not found");
    }

    const [supplierBookings, staffAssignments, recoveryPlans] = await Promise.all([
      FinanceRepository.listSupplierBookings(workspaceId, tripId),
      FinanceRepository.listStaffAssignments(workspaceId, tripId),
      FinanceRepository.listRecoveryPlans(workspaceId, tripId),
    ]);

    const booking = trip.booking;
    const totalRevenue = money(booking?.totalAmount);
    const paidAmount = money(booking?.paidAmount);
    const balanceAmount = money(booking?.balanceAmount);
    const totals = sumCosts(supplierBookings, staffAssignments, recoveryPlans);
    const metrics = profitability({ revenue: totalRevenue, totals });
    const variance = round2(totals.actualCost - totals.estimatedCost);

    return {
      workspaceId: trip.workspaceId,
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      tripName: trip.name,
      status: trip.status,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      currency: dominantCurrency(
        [...supplierBookings, ...staffAssignments],
        booking?.currency,
      ),
      bookingId: booking?.id ?? null,
      totalRevenue: round2(totalRevenue),
      paidAmount: round2(paidAmount),
      outstandingAmount: round2(balanceAmount > 0 ? balanceAmount : Math.max(0, totalRevenue - paidAmount)),
      totalEstimatedCost: totals.estimatedCost,
      totalActualCost: totals.actualCost,
      costVariance: {
        amount: variance,
        percent: percentOf(variance, totals.estimatedCost),
        exceedsEstimate: totals.estimatedCost > 0 && variance > 0,
      },
      grossProfit: metrics.grossProfit,
      marginPercent: metrics.marginPercent,
      marginBand: metrics.marginBand,
      breakdown: buildBreakdown(totals),
    };
  }

  static async getWorkspaceFinancialSummary(
    workspaceId: string,
    options: { includeEmpty?: boolean } = {},
  ): Promise<WorkspaceFinancialSummary> {
    const trips = await FinanceRepository.listTripsWithCosts(workspaceId);

    const rows = trips
      .map((trip) => ({ row: toProfitabilityRow(trip), trip }))
      // Trips with no booking and no spend yet say nothing about profitability.
      .filter(({ row }) => options.includeEmpty || row.totalRevenue > 0 || row.totalCost > 0)
      .map(({ row }) => row)
      .sort((a, b) => b.marginPercent - a.marginPercent);

    const totalRevenue = round2(rows.reduce((sum, row) => sum + row.totalRevenue, 0));
    const totalActualCost = round2(rows.reduce((sum, row) => sum + row.totalCost, 0));
    const totalPaid = round2(trips.reduce((sum, trip) => sum + money(trip.booking?.paidAmount), 0));
    const totalOutstanding = round2(
      trips.reduce((sum, trip) => {
        if (!trip.booking) return sum;
        const balance = money(trip.booking.balanceAmount);
        return sum + (balance > 0 ? balance : Math.max(0, money(trip.booking.totalAmount) - money(trip.booking.paidAmount)));
      }, 0),
    );
    const totalEstimatedCost = round2(
      trips.reduce((sum, trip) => {
        const totals = sumCosts(
          trip.supplierBookings,
          trip.staffAssignments,
          trip.disruptions.flatMap((disruption) => (disruption.recoveryPlan ? [disruption.recoveryPlan] : [])),
        );
        return sum + totals.estimatedCost;
      }, 0),
    );

    const totalActualProfit = round2(totalRevenue - totalActualCost);
    const currency = dominantCurrency(
      trips.flatMap((trip) => [
        ...trip.supplierBookings,
        ...trip.staffAssignments,
      ]),
      trips.find((trip) => trip.booking)?.booking?.currency,
    );

    // Only revenue-bearing trips can be "most profitable".
    const revenueRows = rows.filter((row) => row.totalRevenue > 0);

    return {
      currency,
      totalRevenue,
      totalPaid,
      totalOutstanding,
      totalEstimatedCost,
      totalActualCost,
      totalEstimatedProfit: round2(totalRevenue - totalEstimatedCost),
      totalActualProfit,
      overallMarginPercent: totalRevenue > 0 ? percentOf(totalActualProfit, totalRevenue) : 0,
      tripCount: rows.length,
      lowMarginTripCount: revenueRows.filter((row) => row.marginPercent < FINANCE_LOW_MARGIN_PERCENT).length,
      mostProfitableTrip: revenueRows.length ? revenueRows[0] : null,
      trips: rows,
    };
  }
}
