import type {
  DashboardKpis,
  OperationalAnalytics,
  SupplierReliabilityReport,
  TripProfitabilityReport,
} from "@trailcomand/shared";
import { CSV_BOM, toCsv, type CsvValue } from "./csv.js";

/**
 * CSV projections of the analytics reports.
 *
 * Each export reuses the *same* report object the screen renders, so a total in
 * the file is the total on the page. Only fields already shown to the user are
 * written: no traveller names, passports, contacts or internal ids beyond the
 * trip number a user already sees.
 */

export interface CsvExport {
  filename: string;
  body: string;
}

const money = (value: number) => Math.round(value * 100) / 100;
const percent = (value: number | null) =>
  value === null ? "" : Math.round(value * 100) / 100;
const iso = (value: string) => value.slice(0, 10);

export function tripProfitabilityCsv(
  report: TripProfitabilityReport,
  options: { includeIncomplete: boolean },
): CsvExport {
  const rows = options.includeIncomplete
    ? report.rows
    : report.rows.filter((row) => row.complete);
  const body = toCsv(
    [
      "Trip number",
      "Trip name",
      "Status",
      "Start date",
      "End date",
      "Currency",
      "Revenue",
      "Actual cost",
      "Profit",
      "Margin %",
      "Data complete",
      "Completeness note",
    ],
    rows.map<CsvValue[]>((row) => [
      row.tripNumber,
      row.name,
      row.status,
      iso(row.startDate),
      iso(row.endDate),
      row.currency,
      money(row.revenue),
      money(row.actualCost),
      money(row.profit),
      percent(row.marginPercent),
      row.complete ? "yes" : "no",
      row.completenessNote ?? "",
    ]),
  );
  return {
    filename: `trip-profitability-${report.period.year}.csv`,
    body: CSV_BOM + body,
  };
}

export function supplierReliabilityCsv(
  report: SupplierReliabilityReport,
): CsvExport {
  const body = toCsv(
    [
      "Supplier",
      "Category",
      "Status",
      "Currency",
      "Bookings in window",
      "Completed",
      "Cancelled / no-show",
      "Attributed disruptions",
      "High-severity attributed",
      "Affected trips",
      "Service value",
      "Reliability %",
      "Basis",
      "Explanation",
    ],
    report.suppliers.map<CsvValue[]>((row) => [
      row.supplierName,
      row.category,
      row.status,
      row.currency,
      row.bookingsInWindow,
      row.completedBookings,
      row.cancelledBookings,
      row.attributedDisruptions,
      row.attributedHighSeverity,
      row.affectedTrips,
      money(row.serviceValue),
      percent(row.reliabilityPercent),
      row.basis,
      row.explanation,
    ]),
  );
  return {
    filename: `supplier-reliability-${report.period.year}.csv`,
    body: CSV_BOM + body,
  };
}

export function dashboardKpisCsv(kpis: DashboardKpis): CsvExport {
  const rows: CsvValue[][] = [
    [
      "Revenue YTD",
      kpis.currency,
      money(kpis.revenueYtd.value ?? 0),
      kpis.revenueYtd.availability,
      kpis.revenueYtd.definition,
    ],
    [
      "Refunds netted off revenue",
      kpis.currency,
      money(kpis.revenueYtd.refunds),
      "AVAILABLE",
      "REFUND payments received in the period against the bookings counted above.",
    ],
    [
      "Profit margin %",
      "%",
      percent(kpis.profitMargin.value),
      kpis.profitMargin.availability,
      kpis.profitMargin.definition,
    ],
    [
      "Actual costs",
      kpis.currency,
      money(kpis.profitMargin.actualCosts),
      kpis.profitMargin.availability,
      "",
    ],
    [
      "Total trips",
      "trips",
      kpis.totalTrips.value,
      "AVAILABLE",
      kpis.totalTrips.definition,
    ],
    [
      "Active disruptions",
      "disruptions",
      kpis.activeDisruptions.value,
      "AVAILABLE",
      kpis.activeDisruptions.definition,
    ],
  ];
  for (const currency of kpis.excludedCurrencies) {
    rows.push([
      "Excluded currency",
      currency,
      "",
      "NOT_INCLUDED",
      "Held in another currency; not added to the totals above.",
    ]);
  }
  const body = toCsv(
    ["Metric", "Unit", "Value", "Availability", "Definition"],
    rows,
  );
  return { filename: `dashboard-kpis-${kpis.year}.csv`, body: CSV_BOM + body };
}

export function operationalAnalyticsCsv(
  report: OperationalAnalytics,
): CsvExport {
  const rows: CsvValue[][] = [
    ["Disruptions in window", "count", report.disruptions.totalInWindow],
    ["Active disruptions (in window)", "count", report.disruptions.active],
    ["Resolved", "count", report.disruptions.resolved],
    ["Closed", "count", report.disruptions.closed],
    ["Trips affected (in window)", "count", report.affectedTrips.count],
    [
      "Trips currently affected",
      "count",
      report.affectedTrips.currentlyAffected,
    ],
    [
      "Recorded recovery cost",
      report.recovery.currency,
      money(report.recovery.recordedCost),
    ],
    [
      "Recovery plans with a recorded cost",
      "count",
      report.recovery.plansWithCost,
    ],
    [
      "Average resolution hours",
      "hours",
      percent(report.recovery.averageResolutionHours),
    ],
    ["Recovery tasks completed", "count", report.recovery.tasksCompleted],
    ["Recovery tasks total", "count", report.recovery.tasksTotal],
  ];
  for (const item of report.disruptions.byCategory) {
    rows.push([`Category: ${item.category}`, "count", item.count]);
  }
  for (const item of report.disruptions.bySeverity) {
    rows.push([`Severity: ${item.severity}`, "count", item.count]);
  }
  const body = toCsv(["Metric", "Unit", "Value"], rows);
  return {
    filename: `operational-analytics-${report.period.year}.csv`,
    body: CSV_BOM + body,
  };
}
