import { describe, it, expect } from "vitest";

import { buildRevenue } from '../analytics.service.js';
import { csvFilename, toCsv, CSV_BOM } from "../csv.js";
import { dashboardKpisCsv } from '../analytics.export.js';
import { buildDashboardKpis } from '../analytics.service.js';
import { tripProfitabilityCsv } from '../analytics.export.js';
import { supplierReliabilityCsv } from '../analytics.export.js';
import { buildSupplierReliability } from '../analytics.service.js';
import type { AnalyticsTripRow } from '../analytics.repository.js';
import { buildOperationalAnalytics } from '../analytics.service.js';
import type { AnalyticsRevenueRow } from '../analytics.repository.js';
import { marginPercent, periodForYear } from '../analytics.service.js';
import type { AnalyticsDisruptionRow } from '../analytics.repository.js';
import { buildTripProfitability, estimateTrip } from '../analytics.service.js';

const dec = (value: number | null) =>
  value === null ? null : { toString: () => String(value) };

function trip(overrides: Partial<AnalyticsTripRow> = {}): AnalyticsTripRow {
  return {
    id: "trip-1",
    tripNumber: "TRP-1",
    name: "Everest Base Camp",
    status: "COMPLETED",
    startDate: new Date("2026-04-01T00:00:00Z"),
    endDate: new Date("2026-04-14T00:00:00Z"),
    booking: {
      totalAmount: dec(100000)!,
      currency: "NPR",
      status: "CONFIRMED",
    },
    supplierBookings: [
      {
        estimatedCost: dec(20000),
        confirmedCost: dec(25000),
        actualCost: dec(30000),
        currency: "NPR",
        status: "COMPLETED",
        serviceDate: new Date("2026-04-02T00:00:00Z"),
        supplierId: "sup-1",
      },
    ],
    staffAssignments: [
      { agreedRate: dec(10000), currency: "NPR", status: "CONFIRMED" },
    ],
    disruptions: [],
    ...overrides,
  };
}

function booking(
  overrides: Partial<AnalyticsRevenueRow> = {},
): AnalyticsRevenueRow {
  return {
    tripId: "trip-1",
    bookingNumber: "BK-1",
    currency: "NPR",
    status: "CONFIRMED",
    totalAmount: dec(100000)!,
    createdAt: new Date("2026-02-01T00:00:00Z"),
    refundedAmount: 0,
    ...overrides,
  };
}

/**
 * Structural shape the builders actually read. Kept local so fixtures do not
 * have to construct Prisma `Decimal` instances for fields nothing inspects.
 */
type DisruptionFixture = {
  id: string;
  tripId: string;
  status: string;
  category: string;
  severity: string;
  reportedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  impacts: { entityId: string; entityName: string }[];
  recoveryPlan: {
    status: string;
    estimatedCost: { toString(): string } | null;
    tasks: { status: string }[];
  } | null;
};

function disruption(overrides: Partial<DisruptionFixture> = {}): AnalyticsDisruptionRow {
  return {
    id: "dis-1",
    tripId: "trip-1",
    status: "RESOLVED",
    category: "WEATHER",
    severity: "HIGH",
    reportedAt: new Date("2026-04-03T00:00:00Z"),
    resolvedAt: new Date("2026-04-03T06:00:00Z"),
    closedAt: null,
    impacts: [],
    recoveryPlan: null,
    ...overrides,
  } as unknown as AnalyticsDisruptionRow;
}



describe("periodForYear", () => {
  it("uses an explicit UTC calendar-year boundary", () => {
    const period = periodForYear(2026);
    expect(period.from).toBe("2026-01-01T00:00:00.000Z");
    expect(period.to).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("buildRevenue", () => {
  it("sums contracted booking value in the dominant currency", () => {
    const bucket = buildRevenue([
      booking(),
      booking({ bookingNumber: "BK-2" }),
    ]);
    expect(bucket.revenue).toBe(200000);
    expect(bucket.bookings).toBe(2);
    expect(bucket.refunds).toBe(0);
  });

  it("nets refunds off revenue and reports them separately", () => {
    const bucket = buildRevenue([booking({ refundedAmount: 40000 })]);
    expect(bucket.revenue).toBe(60000);
    expect(bucket.refunds).toBe(40000);
  });

  it("never drives revenue negative when a refund exceeds the booking", () => {
    expect(buildRevenue([booking({ refundedAmount: 150000 })]).revenue).toBe(0);
  });

  it("keeps other currencies out of the total and names them", () => {
    const bucket = buildRevenue([
      booking(),
      booking({ bookingNumber: "BK-2" }),
      booking({ bookingNumber: "BK-3", currency: "USD" }),
    ]);
    expect(bucket.currency).toBe("NPR");
    expect(bucket.revenue).toBe(200000);
    expect(bucket.excluded).toEqual(["USD"]);
  });

  it("ignores zero-value bookings", () => {
    expect(buildRevenue([booking({ totalAmount: dec(0)! })]).bookings).toBe(0);
  });
});

describe("marginPercent", () => {
  it("returns null rather than dividing by zero", () => {
    expect(marginPercent(0, 500)).toBeNull();
  });

  it("computes (revenue - cost) / revenue", () => {
    expect(marginPercent(100000, 40000)).toBe(60);
  });

  it("can be negative", () => {
    expect(marginPercent(100000, 150000)).toBe(-50);
  });
});

describe("estimateTrip", () => {
  it("prefers actual cost, then confirmed, then estimated", () => {
    expect(estimateTrip(trip()).actualCost).toBe(40000); // 30000 supplier + 10000 staff
  });

  it("falls back to confirmed then estimated cost", () => {
    const confirmed = trip({
      supplierBookings: [
        {
          estimatedCost: dec(10000),
          confirmedCost: dec(15000),
          actualCost: null,
          currency: "NPR",
          status: "COMPLETED",
          serviceDate: new Date(),
          supplierId: "sup-1",
        },
      ],
      staffAssignments: [],
    });
    expect(estimateTrip(confirmed).actualCost).toBe(15000);

    const estimated = trip({
      supplierBookings: [
        {
          estimatedCost: dec(10000),
          confirmedCost: null,
          actualCost: null,
          currency: "NPR",
          status: "INQUIRY",
          serviceDate: new Date(),
          supplierId: "sup-1",
        },
      ],
      staffAssignments: [],
    });
    expect(estimateTrip(estimated).actualCost).toBe(10000);
  });

  it("excludes cancelled supplier bookings from cost", () => {
    const cancelled = trip({
      supplierBookings: [
        {
          estimatedCost: dec(20000),
          confirmedCost: null,
          actualCost: dec(20000),
          currency: "NPR",
          status: "CANCELLED",
          serviceDate: new Date(),
          supplierId: "sup-1",
        },
      ],
      staffAssignments: [],
    });
    expect(estimateTrip(cancelled).actualCost).toBe(0);
    expect(estimateTrip(cancelled).hasCost).toBe(false);
  });

  it("counts only non-draft recovery spend", () => {
    const withPlan = (status: string) =>
      trip({
        supplierBookings: [],
        staffAssignments: [],
        disruptions: [
          disruption({
            recoveryPlan: { status, estimatedCost: dec(5000), tasks: [] },
          }),
        ] as never,
      });
    expect(estimateTrip(withPlan("DRAFT")).actualCost).toBe(0);
    expect(estimateTrip(withPlan("APPROVED")).actualCost).toBe(5000);
  });

  it("treats a trip with no booking as zero revenue", () => {
    const estimate = estimateTrip(trip({ booking: null }));
    expect(estimate.revenue).toBe(0);
    expect(estimate.hasRevenue).toBe(false);
  });
});

describe("buildDashboardKpis", () => {
  it("recognises revenue from bookings, not from trip start dates", () => {
    const kpis = buildDashboardKpis({
      year: 2026,
      trips: [trip()],
      activeDisruptions: 0,
      bookings: [booking({ totalAmount: dec(50000)! })],
    });
    expect(kpis.revenueYtd.value).toBe(50000);
    expect(kpis.profitMargin.revenue).toBe(50000);
    expect(kpis.profitMargin.actualCosts).toBe(40000);
    expect(kpis.profitMargin.value).toBe(20);
  });

  it("reports margin as unavailable when there is no revenue", () => {
    const kpis = buildDashboardKpis({
      year: 2026,
      trips: [trip({ booking: null })],
      activeDisruptions: 0,
      bookings: [],
    });
    expect(kpis.revenueYtd.value).toBe(0);
    expect(kpis.profitMargin.value).toBeNull();
    expect(kpis.profitMargin.availability).toBe("UNAVAILABLE");
  });

  it("marks revenue partial when another currency is present", () => {
    const kpis = buildDashboardKpis({
      year: 2026,
      trips: [trip()],
      activeDisruptions: 0,
      bookings: [
        booking(),
        booking({ bookingNumber: "BK-2", currency: "USD" }),
      ],
    });
    expect(kpis.revenueYtd.availability).toBe("PARTIAL");
    expect(kpis.excludedCurrencies).toContain("USD");
  });

  it("counts trips that are not cancelled", () => {
    const kpis = buildDashboardKpis({
      year: 2026,
      trips: [trip(), trip({ id: "trip-2", status: "CANCELLED" })],
      activeDisruptions: 2,
    });
    expect(kpis.totalTrips.value).toBe(1);
    expect(kpis.activeDisruptions.value).toBe(2);
  });

  it("flags revenue-bearing trips that have no recorded cost", () => {
    const kpis = buildDashboardKpis({
      year: 2026,
      trips: [trip({ supplierBookings: [], staffAssignments: [] })],
      activeDisruptions: 0,
      bookings: [booking()],
    });
    expect(kpis.dataQuality.tripsWithRevenueButNoCost).toBe(1);
    expect(kpis.dataQuality.note).toMatch(/no recorded costs/);
  });

  it("handles an empty workspace without throwing", () => {
    const kpis = buildDashboardKpis({
      year: 2026,
      trips: [],
      activeDisruptions: 0,
      bookings: [],
    });
    expect(kpis.revenueYtd.value).toBe(0);
    expect(kpis.totalTrips.value).toBe(0);
    expect(kpis.profitMargin.value).toBeNull();
  });
});

describe("buildTripProfitability", () => {
  it("computes per-trip profit and margin", () => {
    const report = buildTripProfitability({
      year: 2026,
      trips: [trip()],
      limit: 10,
      offset: 0,
      sort: "margin",
      direction: "desc",
    });
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0].revenue).toBe(100000);
    expect(report.rows[0].actualCost).toBe(40000);
    expect(report.rows[0].profit).toBe(60000);
    expect(report.rows[0].marginPercent).toBe(60);
    expect(report.rows[0].complete).toBe(true);
    expect(report.rows[0].completenessNote).toBeNull();
  });

  it("marks a trip with revenue but no cost as incomplete", () => {
    const report = buildTripProfitability({
      year: 2026,
      trips: [trip({ supplierBookings: [], staffAssignments: [] })],
      limit: 10,
      offset: 0,
      sort: "margin",
      direction: "desc",
    });
    expect(report.rows[0].complete).toBe(false);
    expect(report.rows[0].completenessNote).toMatch(/No actual costs/);
    expect(report.totals.incompleteTrips).toBe(1);
  });

  it("reports no margin for a trip without a booking", () => {
    const report = buildTripProfitability({
      year: 2026,
      trips: [trip({ booking: null })],
      limit: 10,
      offset: 0,
      sort: "margin",
      direction: "desc",
    });
    expect(report.rows[0].marginPercent).toBeNull();
    expect(report.rows[0].completenessNote).toMatch(/No booking value/);
  });

  it("keeps currencies separate", () => {
    const report = buildTripProfitability({
      year: 2026,
      trips: [
        trip(),
        trip({
          id: "trip-usd",
          tripNumber: "TRP-USD",
          booking: {
            totalAmount: dec(5000)!,
            currency: "USD",
            status: "CONFIRMED",
          },
        }),
      ],
      limit: 10,
      offset: 0,
      sort: "margin",
      direction: "desc",
    });
    expect(report.currency).toBe("NPR");
    expect(report.excludedCurrencies).toEqual(["USD"]);
    expect(report.totals.revenue).toBe(100000);
  });

  it("paginates while reporting totals for the whole set", () => {
    const trips = Array.from({ length: 5 }, (_, index) =>
      trip({ id: `trip-${index}`, tripNumber: `TRP-${index}` }),
    );
    const report = buildTripProfitability({
      year: 2026,
      trips,
      limit: 2,
      offset: 0,
      sort: "revenue",
      direction: "desc",
    });
    expect(report.rows).toHaveLength(2);
    expect(report.totals.trips).toBe(5);
    expect(report.totals.revenue).toBe(500000);
  });

  it("sorts ascending when asked", () => {
    const report = buildTripProfitability({
      year: 2026,
      trips: [
        trip({
          id: "a",
          tripNumber: "A",
          booking: {
            totalAmount: dec(90000)!,
            currency: "NPR",
            status: "CONFIRMED",
          },
        }),
        trip({
          id: "b",
          tripNumber: "B",
          booking: {
            totalAmount: dec(20000)!,
            currency: "NPR",
            status: "CONFIRMED",
          },
        }),
      ],
      limit: 10,
      offset: 0,
      sort: "revenue",
      direction: "asc",
    });
    expect(report.rows.map((row) => row.tripNumber)).toEqual(["B", "A"]);
  });

  it("handles an empty trip list", () => {
    const report = buildTripProfitability({
      year: 2026,
      trips: [],
      limit: 10,
      offset: 0,
      sort: "margin",
      direction: "desc",
    });
    expect(report.rows).toEqual([]);
    expect(report.totals.revenue).toBe(0);
    expect(report.totals.marginPercent).toBeNull();
  });
});

describe("buildSupplierReliability", () => {
  const suppliers = [
    {
      id: "sup-1",
      name: "Khumbu Lodge",
      category: "ACCOMMODATION",
      status: "ACTIVE",
      currency: "NPR",
    },
    {
      id: "sup-2",
      name: "Summit Transport",
      category: "TRANSPORT",
      status: "ACTIVE",
      currency: "NPR",
    },
  ];
  type SupplierBookingRow = Parameters<typeof buildSupplierReliability>[0]["bookings"][number];
  const bookingRow = (overrides: Partial<SupplierBookingRow> = {}): SupplierBookingRow => ({
    id: "sb-1",
    supplierId: "sup-1",
    tripId: "trip-1",
    status: "COMPLETED",
    currency: "NPR",
    estimatedCost: dec(1000),
    confirmedCost: dec(1000),
    actualCost: dec(1000),
    ...overrides,
  });

  it("scores a supplier with no attributed disruption at 100", () => {
    const report = buildSupplierReliability({
      year: 2026,
      suppliers,
      bookings: [
        bookingRow(),
        bookingRow({ id: "sb-2" }),
        bookingRow({ id: "sb-3" }),
      ],
      disruptions: [],
      minBookings: 3,
    });
    const row = report.suppliers.find((s) => s.supplierId === "sup-1")!;
    expect(row.reliabilityPercent).toBe(100);
    expect(row.basis).toBe("NO_DISRUPTIONS");
  });

  it("does not blame a supplier for an unattributed disruption on the same trip", () => {
    const report = buildSupplierReliability({
      year: 2026,
      suppliers,
      bookings: [
        bookingRow(),
        bookingRow({ id: "sb-2" }),
        bookingRow({ id: "sb-3" }),
      ],
      // No `impacts` rows naming the supplier.
      disruptions: [disruption({ status: "RESOLVED" })],
      minBookings: 3,
    });
    const row = report.suppliers.find((s) => s.supplierId === "sup-1")!;
    expect(row.reliabilityPercent).toBe(100);
    expect(row.attributedDisruptions).toBe(0);
  });

  it("counts a disruption only when an impact assessment names the supplier", () => {
    const report = buildSupplierReliability({
      year: 2026,
      suppliers,
      bookings: [
        bookingRow(),
        bookingRow({ id: "sb-2" }),
        bookingRow({ id: "sb-3" }),
      ],
      disruptions: [
        disruption({
          impacts: [{ entityId: "sup-1", entityName: "Khumbu Lodge" }],
        }),
      ],
      minBookings: 3,
    });
    const row = report.suppliers.find((s) => s.supplierId === "sup-1")!;
    expect(row.attributedDisruptions).toBe(1);
    expect(row.affectedTrips).toBe(1);
    // All three bookings are on the affected trip.
    expect(row.reliabilityPercent).toBe(0);
    expect(row.basis).toBe("HAS_DISRUPTIONS");
  });

  it("does not attribute a disruption on a trip the supplier was not booked for", () => {
    const report = buildSupplierReliability({
      year: 2026,
      suppliers,
      bookings: [
        bookingRow({ tripId: "trip-9" }),
        bookingRow({ id: "sb-2", tripId: "trip-9" }),
        bookingRow({ id: "sb-3", tripId: "trip-9" }),
      ],
      disruptions: [
        disruption({
          tripId: "trip-other",
          impacts: [{ entityId: "sup-1", entityName: "Khumbu Lodge" }],
        }),
      ],
      minBookings: 3,
    });
    const row = report.suppliers.find((s) => s.supplierId === "sup-1")!;
    expect(row.affectedTrips).toBe(0);
    expect(row.reliabilityPercent).toBe(100);
  });

  it("reports insufficient data instead of a perfect score for zero bookings", () => {
    const report = buildSupplierReliability({
      year: 2026,
      suppliers,
      bookings: [],
      disruptions: [],
      minBookings: 3,
    });
    for (const row of report.suppliers) {
      expect(row.totalBookings).toBe(0);
      expect(row.reliabilityPercent).toBeNull();
      expect(row.basis).toBe("INSUFFICIENT_DATA");
    }
  });

  it("requires the minimum sample size before scoring", () => {
    const report = buildSupplierReliability({
      year: 2026,
      suppliers,
      bookings: [bookingRow(), bookingRow({ id: "sb-2" })],
      disruptions: [],
      minBookings: 3,
    });
    const row = report.suppliers.find((s) => s.supplierId === "sup-1")!;
    expect(row.totalBookings).toBe(2);
    expect(row.reliabilityPercent).toBeNull();
    expect(row.explanation).toMatch(/at least 3/);
  });

  it("excludes cancelled and no-show bookings from the denominator", () => {
    const report = buildSupplierReliability({
      year: 2026,
      suppliers,
      bookings: [
        bookingRow(),
        bookingRow({ id: "sb-2" }),
        bookingRow({ id: "sb-3" }),
        bookingRow({ id: "sb-4", status: "CANCELLED" }),
        bookingRow({ id: "sb-5", status: "NO_SHOW" }),
      ],
      disruptions: [],
      minBookings: 3,
    });
    const row = report.suppliers.find((s) => s.supplierId === "sup-1")!;
    expect(row.totalBookings).toBe(3);
    expect(row.cancelledBookings).toBe(2);
  });
});

describe("buildOperationalAnalytics", () => {
  it("separates active from resolved disruptions", () => {
    const report = buildOperationalAnalytics({
      year: 2026,
      disruptions: [
        disruption({ id: "d1", status: "EXECUTING", resolvedAt: null }),
        disruption({ id: "d2", status: "RESOLVED" }),
        disruption({
          id: "d3",
          status: "CLOSED",
          resolvedAt: null,
          closedAt: new Date(),
        }),
      ],
      currentlyAffectedTrips: 1,
      currency: "NPR",
    });
    expect(report.disruptions.totalInWindow).toBe(3);
    expect(report.disruptions.active).toBe(1);
    expect(report.disruptions.resolved).toBe(1);
    expect(report.disruptions.closed).toBe(1);
  });

  it("computes average resolution hours from recorded timestamps", () => {
    const report = buildOperationalAnalytics({
      year: 2026,
      disruptions: [
        disruption({ id: "d1", resolvedAt: new Date("2026-04-03T06:00:00Z") }), // 6h
        disruption({ id: "d2", resolvedAt: new Date("2026-04-03T12:00:00Z") }), // 12h
      ],
      currentlyAffectedTrips: 0,
      currency: "NPR",
    });
    expect(report.recovery.averageResolutionHours).toBe(9);
    expect(report.recovery.resolvedCount).toBe(2);
  });

  it("returns null resolution time when nothing was resolved", () => {
    const report = buildOperationalAnalytics({
      year: 2026,
      disruptions: [disruption({ status: "REPORTED", resolvedAt: null })],
      currentlyAffectedTrips: 1,
      currency: "NPR",
    });
    expect(report.recovery.averageResolutionHours).toBeNull();
  });

  it("counts only approved recovery plans as recorded cost", () => {
    const report = buildOperationalAnalytics({
      year: 2026,
      disruptions: [
        disruption({
          id: "d1",
          recoveryPlan: {
            status: "APPROVED",
            estimatedCost: dec(5000),
            tasks: [],
          } as never,
        }),
        disruption({
          id: "d2",
          recoveryPlan: {
            status: "DRAFT",
            estimatedCost: dec(9999),
            tasks: [],
          } as never,
        }),
      ],
      currentlyAffectedTrips: 0,
      currency: "NPR",
    });
    expect(report.recovery.recordedCost).toBe(5000);
    expect(report.recovery.plansWithCost).toBe(1);
  });

  it("handles an empty window", () => {
    const report = buildOperationalAnalytics({
      year: 2026,
      disruptions: [],
      currentlyAffectedTrips: 0,
      currency: "NPR",
    });
    expect(report.disruptions.totalInWindow).toBe(0);
    expect(report.affectedTrips.count).toBe(0);
    expect(report.disruptions.byCategory).toEqual([]);
  });
});

describe("CSV export", () => {
  it("escapes commas, quotes and line breaks", () => {
    const csv = toCsv(
      ["a", "b"],
      [
        ["x,y", 'he said "hi"'],
        ["line\nbreak", null],
      ],
    );
    expect(csv).toContain('"x,y"');
    expect(csv).toContain('"he said ""hi"""');
    expect(csv).toContain('"line\nbreak"');
  });

  it("neutralises spreadsheet formula injection", () => {
    const csv = toCsv(
      ["name"],
      [["=cmd|' /C calc'!A0"], ["+1"], ["-1"], ["@SUM(A1)"]],
    );
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("'=cmd|' /C calc'!A0");
    expect(lines[2]).toBe("'+1");
    expect(lines[3]).toBe("'-1");
    expect(lines[4]).toBe("'@SUM(A1)");
  });

  it("keeps numbers numeric", () => {
    expect(toCsv(["v"], [[-1200.5]])).toBe("v\r\n-1200.5\r\n");
  });

  it("sanitises the download filename", () => {
    expect(csvFilename('../../evil"; name')).toMatch(/^[a-zA-Z0-9._-]+\.csv$/);
  });

  it("exports the same totals the report shows", () => {
    const report = buildTripProfitability({
      year: 2026,
      trips: [trip()],
      limit: 10,
      offset: 0,
      sort: "margin",
      direction: "desc",
    });
    const file = tripProfitabilityCsv(report, { includeIncomplete: true });
    expect(file.body.startsWith(CSV_BOM)).toBe(true);
    expect(file.filename).toBe("trip-profitability-2026.csv");
    expect(file.body).toContain("100000");
    expect(file.body).toContain("60000");
    expect(file.body).toContain("60");
  });

  it("can drop incomplete trips from the export", () => {
    const report = buildTripProfitability({
      year: 2026,
      trips: [
        trip(),
        trip({
          id: "t2",
          tripNumber: "TRP-2",
          supplierBookings: [],
          staffAssignments: [],
        }),
      ],
      limit: 10,
      offset: 0,
      sort: "margin",
      direction: "desc",
    });
    const all = tripProfitabilityCsv(report, { includeIncomplete: true });
    const completeOnly = tripProfitabilityCsv(report, {
      includeIncomplete: false,
    });
    expect(all.body).toContain("TRP-2");
    expect(completeOnly.body).not.toContain("TRP-2");
  });

  it("never exports traveller PII", () => {
    const report = buildSupplierReliability({
      year: 2026,
      suppliers: [
        {
          id: "s1",
          name: "Lodge",
          category: "ACCOMMODATION",
          status: "ACTIVE",
          currency: "NPR",
        },
      ],
      bookings: [],
      disruptions: [],
      minBookings: 3,
    });
    const file = supplierReliabilityCsv(report);
    expect(file.body).not.toMatch(/passport/i);
    expect(file.body).not.toMatch(/@/);
  });

  it("exports KPIs including the refund line", () => {
    const kpis = buildDashboardKpis({
      year: 2026,
      trips: [trip()],
      activeDisruptions: 0,
      bookings: [booking({ refundedAmount: 10000 })],
    });
    const file = dashboardKpisCsv(kpis);
    expect(file.body).toContain("Revenue YTD");
    expect(file.body).toContain("Refunds netted off revenue");
    expect(file.body).toContain("90000");
  });
});
