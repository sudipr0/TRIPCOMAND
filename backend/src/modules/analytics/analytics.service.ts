import type {
  AnalyticsPeriod,
  DashboardKpis,
  OperationalAnalytics,
  SupplierReliabilityReport,
  SupplierReliabilityRow,
  TripProfitabilityReport,
  TripProfitabilityReportRow,
} from "@trailcomand/shared";
import {
  CANCELLED_SUPPLIER_BOOKING_STATUSES,
  FinanceRepository,
} from "../finance/finance.repository.js";
import { effectiveSupplierCost, money, percentOf } from "../finance/finance.service.js";
import {
  AnalyticsRepository,
  OPEN_DISRUPTION_STATUSES,
  RECORDED_RECOVERY_STATUSES,
  type AnalyticsDisruptionRow,
  type AnalyticsRevenueRow,
  type AnalyticsTripRow,
} from "./analytics.repository.js";

/**
 * Business intelligence for the workspace.
 *
 * Ground rules, applied everywhere in this module:
 *  - revenue is the booking's contracted `totalAmount` (the same revenue Finance
 *    reports), never a payment — collecting cash is not earning it;
 *  - costs are *actual* costs only: supplier actual > confirmed > estimated (the
 *    same rule Finance uses), staff agreed rates, and approved recovery spend;
 *  - currencies are bucketed, never summed. A workspace total is reported in one
 *    currency and the other currencies are named as excluded;
 *  - a number is either defensible from the records or reported as unavailable.
 */

const DEFAULT_CURRENCY = "NPR";
const MS_PER_HOUR = 3_600_000;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** UTC calendar-year boundary: [Jan 1 00:00Z, Jan 1 next year 00:00Z). */
export function periodForYear(year: number): AnalyticsPeriod {
  return {
    from: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).toISOString(),
    to: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0)).toISOString(),
    year,
  };
}

/** Pick the currency carrying the most rows; ties break alphabetically. */
export function dominantCurrency(rows: { currency: string }[], fallback?: string | null): string {
  if (!rows.length) return fallback || DEFAULT_CURRENCY;
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.currency, (counts.get(row.currency) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

export function isOpenDisruption(status: string): boolean {
  return (OPEN_DISRUPTION_STATUSES as readonly string[]).includes(status);
}

export function isRecordedRecovery(status: string): boolean {
  return (RECORDED_RECOVERY_STATUSES as readonly string[]).includes(status);
}

export interface TripEstimate {
  /** Contracted booking value. Zero when the trip has no booking. */
  revenue: number;
  /** Actual cost: supplier + staff + recorded recovery. */
  actualCost: number;
  hasRevenue: boolean;
  hasCost: boolean;
}

/** Prices one trip from the nested rows loaded by the repository. */
export function estimateTrip(trip: AnalyticsTripRow): TripEstimate {
  const revenue = money(trip.booking?.totalAmount ?? null);
  const supplierCost = trip.supplierBookings
    .filter((row) => !(CANCELLED_SUPPLIER_BOOKING_STATUSES as readonly string[]).includes(row.status))
    .reduce((sum, row) => sum + effectiveSupplierCost(row), 0);
  const staffCost = trip.staffAssignments.reduce((sum, row) => sum + money(row.agreedRate), 0);
  const recoveryCost = trip.disruptions.reduce((sum, disruption) => {
    const plan = disruption.recoveryPlan;
    if (!plan || !isRecordedRecovery(plan.status)) return sum;
    return sum + money(plan.estimatedCost);
  }, 0);
  const costRows = trip.supplierBookings.filter(
    (row) => !(CANCELLED_SUPPLIER_BOOKING_STATUSES as readonly string[]).includes(row.status),
  ).length;
  return {
    revenue: round2(revenue),
    actualCost: round2(supplierCost + staffCost + recoveryCost),
    hasRevenue: revenue > 0,
    hasCost: costRows > 0 || trip.staffAssignments.length > 0 || recoveryCost > 0,
  };
}

/**
 * Revenue recognised in the period, kept in one currency bucket.
 *
 * Definition: `Booking.totalAmount` for bookings confirmed in the year, on trips
 * that are not cancelled. Refunds received in the same window are netted off:
 * `Payment` rows of type REFUND are the only reversal this schema records, so a
 * refunded booking contributes its contracted value minus what was returned.
 * Payments of every other type are ignored — collecting cash is not earning it.
 */
export interface RevenueBucket {
  currency: string;
  bookings: number;
  revenue: number;
  /** Refund payments netted off `revenue` above. */
  refunds: number;
  /** Bookings carrying money in a different currency, excluded from `revenue`. */
  excluded: string[];
}

export function buildRevenue(rows: AnalyticsRevenueRow[]): RevenueBucket {
  const usable = rows.filter((row) => money(row.totalAmount) > 0);
  const currency = dominantCurrency(usable);
  const inCurrency = usable.filter((row) => row.currency === currency);
  const excluded = [...new Set(usable.map((row) => row.currency))]
    .filter((code) => code !== currency)
    .sort();
  const gross = inCurrency.reduce((sum, row) => sum + money(row.totalAmount), 0);
  const refunds = inCurrency.reduce(
    (sum, row) => sum + Math.max(0, row.refundedAmount ?? 0),
    0,
  );
  return {
    currency,
    bookings: inCurrency.length,
    // A refund can exceed the contracted value in odd data; revenue never goes
    // negative from a refund alone.
    revenue: round2(Math.max(0, gross - refunds)),
    refunds: round2(refunds),
    excluded,
  };
}

/** (revenue - cost) / revenue * 100, or null when there is no revenue to divide by. */
export function marginPercent(revenue: number, cost: number): number | null {
  if (revenue <= 0) return null;
  return percentOf(round2(revenue - cost), revenue);
}

interface Bucketed {
  revenue: number;
  cost: number;
  trips: { trip: AnalyticsTripRow; estimate: TripEstimate; currency: string }[];
  currencies: Set<string>;
}

/**
 * Splits trips into one bucket per currency so NPR revenue is never added to a
 * USD cost. A trip's currency is the booking currency, else its cost currency.
 */
function bucketTripsByCurrency(trips: AnalyticsTripRow[]): Map<string, Bucketed> {
  const buckets = new Map<string, Bucketed>();
  for (const trip of trips) {
    const estimate = estimateTrip(trip);
    const currency =
      trip.booking?.currency ??
      dominantCurrency(
        [...trip.supplierBookings, ...trip.staffAssignments],
        DEFAULT_CURRENCY,
      );
    const bucket = buckets.get(currency) ?? {
      revenue: 0,
      cost: 0,
      trips: [],
      currencies: new Set<string>(),
    };
    bucket.revenue += estimate.revenue;
    bucket.cost += estimate.actualCost;
    bucket.currencies.add(currency);
    bucket.trips.push({ trip, estimate, currency });
    buckets.set(currency, bucket);
  }
  return buckets;
}

/** The largest bucket, rounded — the one the dashboard reports on. */
function primaryBucket(buckets: Map<string, Bucketed>): Bucketed | null {
  const entries = [...buckets.values()];
  if (!entries.length) return null;
  return entries.sort((a, b) => b.trips.length - a.trips.length || b.revenue - a.revenue)[0];
}

export function buildDashboardKpis(input: {
  year: number;
  trips: AnalyticsTripRow[];
  activeDisruptions: number;
  /** When provided, revenue comes from bookings rather than trip rows. */
  bookings?: AnalyticsRevenueRow[];
}): DashboardKpis {
  const period = periodForYear(input.year);
  const buckets = bucketTripsByCurrency(input.trips);
  const primary = primaryBucket(buckets);

  // Revenue is recognised from the *bookings* confirmed in the year, not from the
  // trips that start in it: the two populations are different (a trip can depart
  // next year and still be sold this year), and Finance reports the same figure.
  // When no booking rows are supplied the trip buckets are the only source.
  const revenueBucket = input.bookings
    ? buildRevenue(input.bookings)
    : null;
  const currency = revenueBucket
    ? revenueBucket.currency
    : primary
      ? [...primary.currencies][0]
      : DEFAULT_CURRENCY;
  const excludedCurrencies = revenueBucket
    ? revenueBucket.excluded
    : [...buckets.keys()].filter((code) => code !== currency).sort();

  const revenue = revenueBucket
    ? revenueBucket.revenue
    : primary
      ? round2(primary.revenue)
      : 0;
  // Costs stay on the trip buckets: a trip's cost currency is its booking's, so
  // the trips priced in the reporting currency are the ones whose costs belong
  // next to that revenue. An NPR cost never reduces a USD margin.
  const cost = primary
    ? round2(primary.trips.filter((row) => row.currency === currency).reduce((sum, row) => sum + row.estimate.actualCost, 0))
    : 0;
  const tripsWithRevenue = primary ? primary.trips.filter((t) => t.estimate.hasRevenue).length : 0;
  const tripsWithCost = primary ? primary.trips.filter((t) => t.estimate.hasCost).length : 0;
  const revenueWithoutCost = primary
    ? primary.trips.filter((t) => t.estimate.hasRevenue && !t.estimate.hasCost).length
    : 0;
  const margin = marginPercent(revenue, cost);

  return {
    year: input.year,
    period,
    currency,
    excludedCurrencies,
    revenueYtd: {
      value: revenueBucket ? revenue : primary ? revenue : 0,
      availability: excludedCurrencies.length ? "PARTIAL" : "AVAILABLE",
      refunds: revenueBucket ? revenueBucket.refunds : 0,
      definition:
        "Contracted booking value (Booking.totalAmount) for bookings confirmed in the calendar year, UTC. Cancelled bookings are excluded. Refund payments are netted off the same year's revenue; this schema has no credit note or void record.",
    },
    profitMargin: {
      value: margin,
      currency,
      availability: margin === null ? "UNAVAILABLE" : revenueWithoutCost > 0 ? "PARTIAL" : "AVAILABLE",
      revenue,
      actualCosts: cost,
      definition:
        "(Revenue − actual costs) ÷ revenue × 100. Actual costs = supplier actual/confirmed costs + staff agreed rates + approved recovery spend. Trips with no recorded cost are counted as zero cost, so their margin is optimistic.",
    },
    totalTrips: {
      value: input.trips.filter((trip) => trip.status !== "CANCELLED").length,
      definition: "Trips (not cancelled) whose start date falls inside the reporting year.",
    },
    activeDisruptions: {
      value: input.activeDisruptions,
      definition:
        "Disruptions still in REPORTED, ASSESSING, PLANNED, AWAITING_APPROVAL or EXECUTING on a trip that is not cancelled (open right now, whatever year they were reported).",
    },
    dataQuality: {
      tripsWithRevenue,
      tripsWithAnyCost: tripsWithCost,
      tripsWithRevenueButNoCost: revenueWithoutCost,
      note: revenueWithoutCost
        ? `${revenueWithoutCost} revenue-bearing ${revenueWithoutCost === 1 ? "trip has" : "trips have"} no recorded costs; margin is overstated until supplier and staff costs are entered.`
        : "Every revenue-bearing trip has at least one recorded cost.",
    },
  };
}

export function buildTripProfitability(input: {
  year: number;
  trips: AnalyticsTripRow[];
  limit: number;
  offset: number;
  sort: "margin" | "revenue" | "cost" | "profit" | "startDate";
  direction: "asc" | "desc";
}): TripProfitabilityReport {
  const period = periodForYear(input.year);
  const buckets = bucketTripsByCurrency(input.trips);
  const primary = primaryBucket(buckets);
  const currency = primary ? [...primary.currencies][0] : DEFAULT_CURRENCY;
  const excludedCurrencies = [...buckets.keys()].filter((code) => code !== currency).sort();

  const rows: TripProfitabilityReportRow[] = (primary?.trips ?? []).map(({ trip, estimate }) => {
    const complete = estimate.hasRevenue && estimate.hasCost;
    return {
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      name: trip.name,
      status: trip.status,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      currency,
      revenue: estimate.revenue,
      actualCost: estimate.actualCost,
      profit: round2(estimate.revenue - estimate.actualCost),
      marginPercent: marginPercent(estimate.revenue, estimate.actualCost),
      complete,
      completenessNote: estimate.hasRevenue
        ? estimate.hasCost
          ? null
          : "No actual costs recorded yet — profit is overstated."
        : "No booking value recorded — margin cannot be calculated.",
    };
  });

  const sorted = [...rows].sort((a, b) => {
    const pick = (row: TripProfitabilityReportRow) => {
      switch (input.sort) {
        case "revenue":
          return row.revenue;
        case "cost":
          return row.actualCost;
        case "profit":
          return row.profit;
        case "startDate":
          return new Date(row.startDate).getTime();
        default:
          return row.marginPercent ?? Number.NEGATIVE_INFINITY;
      }
    };
    const delta = pick(a) - pick(b);
    if (delta !== 0) return input.direction === "asc" ? delta : -delta;
    return a.tripNumber.localeCompare(b.tripNumber);
  });

  const paged = sorted.slice(input.offset, input.offset + input.limit);
  // Totals describe the whole filtered set, not the visible page.
  const revenue = round2(rows.reduce((sum, row) => sum + row.revenue, 0));
  const actualCost = round2(rows.reduce((sum, row) => sum + row.actualCost, 0));

  return {
    period,
    currency,
    excludedCurrencies,
    totals: {
      revenue,
      actualCost,
      profit: round2(revenue - actualCost),
      marginPercent: marginPercent(revenue, actualCost),
      trips: rows.length,
      incompleteTrips: rows.filter((row) => !row.complete).length,
    },
    rows: paged,
  };
}

/**
 * Supplier reliability.
 *
 * Denominator: supplier bookings whose service date is inside the window, in the
 * supplier's currency, excluding CANCELLED and NO_SHOW (a cancelled reservation
 * never happened, so it is neither a success nor a failure of the supplier).
 *
 * Numerator: those bookings *not* touched by an attributed disruption. A
 * disruption is attributed to a supplier only when an ImpactAssessment row of
 * entityType "supplier" names that supplier — never because the supplier happens
 * to be booked on the same trip.
 *
 * reliability = (bookings - affectedBookings) / bookings * 100
 *
 * Below `minimumBookings` the score is null with basis INSUFFICIENT_DATA. A
 * supplier with bookings and no attributed disruption scores 100 with basis
 * NO_DISRUPTIONS, which is a fact about the records, not a rating.
 */
export function buildSupplierReliability(input: {
  year: number;
  suppliers: { id: string; name: string; category: string; status: string; currency: string }[];
  bookings: {
    id: string;
    supplierId: string;
    tripId: string;
    status: string;
    currency: string;
    estimatedCost: { toString(): string } | null;
    confirmedCost: { toString(): string } | null;
    actualCost: { toString(): string } | null;
  }[];
  disruptions: AnalyticsDisruptionRow[];
  minBookings: number;
}): SupplierReliabilityReport {
  const period = periodForYear(input.year);

  // supplierId -> trips with an explicitly attributed disruption
  const attributedBySupplier = new Map<
    string,
    { disruptions: number; severe: number; tripIds: Set<string> }
  >();
  for (const disruption of input.disruptions) {
    for (const impact of disruption.impacts) {
      const entry =
        attributedBySupplier.get(impact.entityId) ??
        { disruptions: 0, severe: 0, tripIds: new Set<string>() };
      entry.disruptions += 1;
      if (disruption.severity === "URGENT" || disruption.severity === "HIGH") entry.severe += 1;
      entry.tripIds.add(disruption.tripId);
      attributedBySupplier.set(impact.entityId, entry);
    }
  }

  const activeBookings = input.bookings.filter((row) => row.status !== "CANCELLED" && row.status !== "NO_SHOW");
  const currency = dominantCurrency(
    activeBookings.length ? activeBookings : input.bookings,
    input.suppliers[0]?.currency,
  );
  const excludedCurrencies = [
    ...new Set(input.bookings.map((row) => row.currency)),
  ].filter((code) => code !== currency).sort();

  const rows: SupplierReliabilityRow[] = input.suppliers.map((supplier) => {
    const own = input.bookings.filter(
      (row) => row.supplierId === supplier.id && row.currency === currency,
    );
    const counted = own.filter((row) => row.status !== "CANCELLED" && row.status !== "NO_SHOW");
    const cancelled = own.filter((row) => row.status === "CANCELLED" || row.status === "NO_SHOW");
    const attribution = attributedBySupplier.get(supplier.id);
    // Only count disruptions on trips this supplier was actually booked for in the window.
    const ownTripIds = new Set(counted.map((row) => row.tripId));
    const affectedTrips = new Set(
      [...(attribution?.tripIds ?? [])].filter((tripId) => ownTripIds.has(tripId)),
    );
    const attributed = attribution?.tripIds.size ? attribution.disruptions : 0;
    const attributedHigh = attribution?.tripIds.size ? attribution.severe : 0;
    const affectedBookings = counted.filter((row) => affectedTrips.has(row.tripId)).length;
    const serviceValue = round2(
      counted.reduce((sum, row) => sum + effectiveSupplierCost(row), 0),
    );
    const enough = counted.length >= input.minBookings && input.minBookings > 0;
    const percent = !counted.length || !enough
      ? null
      : round2(((counted.length - affectedBookings) / counted.length) * 100);

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      category: supplier.category,
      status: supplier.status,
      currency,
      totalBookings: counted.length,
      completedBookings: counted.filter((row) => row.status === "COMPLETED").length,
      cancelledBookings: cancelled.length,
      bookingsInWindow: counted.length,
      attributedDisruptions: attributed,
      attributedHighSeverity: attributedHigh,
      affectedTrips: affectedTrips.size,
      serviceValue,
      reliabilityPercent: percent,
      basis:
        percent === null
          ? "INSUFFICIENT_DATA"
          : attributed === 0
            ? "NO_DISRUPTIONS"
            : "HAS_DISRUPTIONS",
      explanation:
        percent === null
          ? `Only ${counted.length} bookable service${counted.length === 1 ? "" : "s"} in this window; at least ${input.minBookings} required before a score means anything.`
          : attributed === 0
            ? `All ${counted.length} service${counted.length === 1 ? "" : "s"} completed without an attributed disruption.`
            : `${affectedBookings} of ${counted.length} service${counted.length === 1 ? "" : "s"} hit by ${attributed} attributed disruption${attributed === 1 ? "" : "s"}.`,
    };
  });

  rows.sort((a, b) => {
    if (a.reliabilityPercent === null && b.reliabilityPercent === null) return b.totalBookings - a.totalBookings;
    if (a.reliabilityPercent === null) return 1;
    if (b.reliabilityPercent === null) return -1;
    return a.reliabilityPercent - b.reliabilityPercent || b.totalBookings - a.totalBookings;
  });

  return {
    period,
    currency,
    excludedCurrencies,
    methodology: {
      window: `Service dates in ${input.year} (UTC).`,
      denominator: "Supplier bookings in the window, excluding CANCELLED and NO_SHOW.",
      numerator: "Those bookings on trips with no disruption attributed to this supplier.",
      formula: "reliability = (bookings − affected bookings) ÷ bookings × 100",
      minimumBookings: input.minBookings,
      attribution:
        "A disruption counts against a supplier only when an impact assessment explicitly names that supplier. Trips with no attributed cause are not blamed on their suppliers.",
    },
    suppliers: rows,
  };
}

export function buildOperationalAnalytics(input: {
  year: number;
  disruptions: AnalyticsDisruptionRow[];
  currentlyAffectedTrips: number;
  currency: string;
}): OperationalAnalytics {
  const period = periodForYear(input.year);
  const disruptions = input.disruptions;
  const categoryCounts = new Map<string, number>();
  const severityCounts = new Map<string, number>();
  for (const disruption of disruptions) {
    categoryCounts.set(disruption.category, (categoryCounts.get(disruption.category) ?? 0) + 1);
    severityCounts.set(disruption.severity, (severityCounts.get(disruption.severity) ?? 0) + 1);
  }

  const resolved = disruptions.filter((d) => d.status === "RESOLVED");
  const resolutionHours = resolved
    .filter((d) => d.resolvedAt)
    .map((d) => (d.resolvedAt!.getTime() - d.reportedAt.getTime()) / MS_PER_HOUR)
    .filter((hours) => Number.isFinite(hours) && hours >= 0);

  const recordedPlans = disruptions.filter(
    (d) => d.recoveryPlan && isRecordedRecovery(d.recoveryPlan.status),
  );
  const recordedCost = recordedPlans.reduce(
    (sum, d) => sum + money(d.recoveryPlan!.estimatedCost),
    0,
  );
  const currency = input.currency;
  const tasks = disruptions.flatMap((d) => d.recoveryPlan?.tasks ?? []);

  return {
    period,
    disruptions: {
      totalInWindow: disruptions.length,
      active: disruptions.filter((d) => isOpenDisruption(d.status)).length,
      resolved: resolved.length,
      closed: disruptions.filter((d) => d.status === "CLOSED").length,
      byCategory: [...categoryCounts.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
      bySeverity: [...severityCounts.entries()]
        .map(([severity, count]) => ({ severity, count }))
        .sort((a, b) => b.count - a.count || a.severity.localeCompare(b.severity)),
    },
    affectedTrips: {
      count: new Set(disruptions.map((d) => d.tripId)).size,
      currentlyAffected: input.currentlyAffectedTrips,
    },
    recovery: {
      recordedCost: round2(recordedCost),
      currency,
      plansWithCost: recordedPlans.length,
      averageResolutionHours: resolutionHours.length
        ? round2(resolutionHours.reduce((sum, hours) => sum + hours, 0) / resolutionHours.length)
        : null,
      resolvedCount: resolutionHours.length,
      tasksCompleted: tasks.filter((task) => task.status === "COMPLETED").length,
      tasksTotal: tasks.length,
    },
  };
}

/** Workspace currency from the finance roll-up, so the dashboard matches the Finance page. */
export async function workspaceCurrency(workspaceId: string): Promise<string> {
  const summary = await FinanceRepository.listTripsWithCosts(workspaceId);
  return dominantCurrency(
    summary.flatMap((trip) => [...trip.supplierBookings, ...trip.staffAssignments]),
    summary.find((trip) => trip.booking)?.booking?.currency,
  );
}

export class AnalyticsService {
  static async dashboardKpis(workspaceId: string, year: number): Promise<DashboardKpis> {
    const period = periodForYear(year);
    const from = new Date(period.from);
    const to = new Date(period.to);
    const [trips, activeDisruptions, bookings] = await Promise.all([
      AnalyticsRepository.listTripsInPeriod(workspaceId, from, to),
      AnalyticsRepository.countActiveDisruptions(workspaceId),
      AnalyticsRepository.listRevenueBookingsInPeriod(workspaceId, from, to),
    ]);
    return buildDashboardKpis({ year, trips, activeDisruptions, bookings });
  }

  static async tripProfitability(
    workspaceId: string,
    query: {
      year: number;
      status?: string;
      sort: "margin" | "revenue" | "cost" | "profit" | "startDate";
      direction: "asc" | "desc";
      limit: number;
      offset: number;
    },
  ): Promise<TripProfitabilityReport> {
    const period = periodForYear(query.year);
    const trips = await AnalyticsRepository.listTripsInPeriod(
      workspaceId,
      new Date(period.from),
      new Date(period.to),
      query.status,
    );
    return buildTripProfitability({ ...query, trips });
  }

  static async supplierReliability(
    workspaceId: string,
    query: { year: number; minBookings: number },
  ): Promise<SupplierReliabilityReport> {
    const period = periodForYear(query.year);
    const from = new Date(period.from);
    const to = new Date(period.to);
    const [{ suppliers, bookings }, disruptions] = await Promise.all([
      AnalyticsRepository.listSuppliersForReliability(workspaceId, from, to),
      AnalyticsRepository.listDisruptionsInPeriod(workspaceId, from, to),
    ]);
    return buildSupplierReliability({
      year: query.year,
      suppliers,
      bookings,
      disruptions,
      minBookings: query.minBookings,
    });
  }

  static async operational(workspaceId: string, year: number): Promise<OperationalAnalytics> {
    const period = periodForYear(year);
    const from = new Date(period.from);
    const to = new Date(period.to);
    const [disruptions, active, currency] = await Promise.all([
      AnalyticsRepository.listDisruptionsInPeriod(workspaceId, from, to),
      AnalyticsRepository.countActiveDisruptions(workspaceId),
      workspaceCurrency(workspaceId),
    ]);
    return buildOperationalAnalytics({
      year,
      disruptions,
      currentlyAffectedTrips: active,
      currency,
    });
  }

  /** The calendar year used when the caller does not specify one. */
  static defaultYear(now: Date = new Date()): number {
    return now.getUTCFullYear();
  }
}
