import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppError } from '../../../lib/errors.js';
import { FinanceRepository } from '../finance.repository.js';
import { effectiveSupplierCost } from '../finance.service.js';
import { sumCosts, toProfitabilityRow } from '../finance.service.js';
import { FinanceService, buildBreakdown } from '../finance.service.js';
import { money, percentOf, profitability } from '../finance.service.js';
import { estimatedSupplierCost, marginBandFor } from '../finance.service.js';

/** Stand-in for Prisma's Decimal: only toString() is used by the engine. */
const dec = (value: number | string) => ({ toString: () => String(value) });

const supplier = (overrides: Partial<Record<string, unknown>> = {}) => ({
  estimatedCost: null,
  confirmedCost: null,
  actualCost: null,
  currency: 'NPR',
  serviceType: 'ACCOMMODATION',
  ...overrides,
});

const staff = (overrides: Partial<Record<string, unknown>> = {}) => ({
  role: 'lead_guide',
  agreedRate: null,
  currency: 'NPR',
  status: 'CONFIRMED',
  ...overrides,
});

function buildTrip(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'trip-1',
    workspaceId: 'ws-1',
    tripNumber: 'TRP-2026-001',
    name: 'Everest Base Camp',
    status: 'READY',
    startDate: new Date('2026-11-10T00:00:00Z'),
    endDate: new Date('2026-11-23T00:00:00Z'),
    bookingId: 'booking-1',
    booking: {
      id: 'booking-1',
      bookingNumber: 'BK-2026-001',
      totalAmount: dec(300000),
      paidAmount: dec(120000),
      balanceAmount: dec(180000),
      currency: 'NPR',
      status: 'CONFIRMED',
    },
    ...overrides,
  };
}

describe('finance money helpers', () => {
  it('treats missing and non-finite values as zero', () => {
    expect(money(null)).toBe(0);
    expect(money(undefined)).toBe(0);
    expect(money('not-a-number')).toBe(0);
    expect(money(dec('1500.50'))).toBe(1500.5);
  });

  it('prefers actual, then confirmed, then estimated', () => {
    expect(effectiveSupplierCost(supplier({ actualCost: dec(900), confirmedCost: dec(800), estimatedCost: dec(700) }))).toBe(900);
    expect(effectiveSupplierCost(supplier({ confirmedCost: dec(800), estimatedCost: dec(700) }))).toBe(800);
    expect(effectiveSupplierCost(supplier({ estimatedCost: dec(700) }))).toBe(700);
    expect(effectiveSupplierCost(supplier())).toBe(0);
  });

  it('uses the estimate for the budgeted side and falls back to a quote', () => {
    expect(estimatedSupplierCost(supplier({ actualCost: dec(900), estimatedCost: dec(700) }))).toBe(700);
    expect(estimatedSupplierCost(supplier({ confirmedCost: dec(800) }))).toBe(800);
  });

  it('never divides by zero', () => {
    expect(percentOf(50, 0)).toBe(0);
    expect(percentOf(50, 200)).toBe(25);
  });
});

describe('finance margin bands', () => {
  it('buckets margin at the documented thresholds', () => {
    expect(marginBandFor(35, 100)).toBe('HEALTHY');
    expect(marginBandFor(20, 100)).toBe('HEALTHY');
    expect(marginBandFor(19.9, 100)).toBe('WARNING');
    expect(marginBandFor(10, 100)).toBe('WARNING');
    expect(marginBandFor(9.9, 100)).toBe('CRITICAL');
    expect(marginBandFor(-5, 100)).toBe('CRITICAL');
    expect(marginBandFor(0, 0)).toBe('NO_REVENUE');
  });
});

describe('sumCosts', () => {
  it('adds suppliers, staff and approved recovery spend', () => {
    const totals = sumCosts(
      [supplier({ estimatedCost: dec(100000), actualCost: dec(120000) }), supplier({ confirmedCost: dec(50000) })],
      [staff({ agreedRate: dec(30000) }), staff({ agreedRate: dec(20000) })],
      [{ estimatedCost: dec(15000), status: 'APPROVED' }],
    );
    expect(totals.suppliers).toBe(170000);
    expect(totals.staff).toBe(50000);
    expect(totals.recovery).toBe(15000);
    expect(totals.actualCost).toBe(235000);
    // Staff rates are agreed up front, so they count on both sides.
    expect(totals.estimatedCost).toBe(200000);
  });

  it('ignores draft recovery plans — they are not committed spend yet', () => {
    const totals = sumCosts([], [], [{ estimatedCost: dec(9000), status: 'DRAFT' }]);
    expect(totals.recovery).toBe(0);
    expect(totals.actualCost).toBe(0);
  });

  it('ignores staff without an agreed rate', () => {
    expect(sumCosts([], [staff({ agreedRate: null })]).staff).toBe(0);
  });
});

describe('breakdown and profitability', () => {
  it('labels each cost source with its share of the total', () => {
    const breakdown = buildBreakdown({ estimatedCost: 0, actualCost: 100000, suppliers: 60000, staff: 30000, recovery: 10000 });
    expect(breakdown).toEqual([
      { category: 'Suppliers', amount: 60000, percent: 60 },
      { category: 'Staff', amount: 30000, percent: 30 },
      { category: 'Recovery', amount: 10000, percent: 10 },
    ]);
  });

  it('omits the recovery slice entirely when there was no recovery spend', () => {
    const breakdown = buildBreakdown({ estimatedCost: 0, actualCost: 50000, suppliers: 50000, staff: 0, recovery: 0 });
    expect(breakdown.map((item) => item.category)).toEqual(['Suppliers', 'Staff']);
  });

  it('computes gross profit and margin from actual cost', () => {
    const result = profitability({
      revenue: 300000,
      totals: { estimatedCost: 200000, actualCost: 210000, suppliers: 160000, staff: 50000, recovery: 0 },
    });
    expect(result.grossProfit).toBe(90000);
    expect(result.marginPercent).toBe(30);
    expect(result.marginBand).toBe('HEALTHY');
  });

  it('reports a loss as a negative margin', () => {
    const result = profitability({
      revenue: 100000,
      totals: { estimatedCost: 0, actualCost: 130000, suppliers: 130000, staff: 0, recovery: 0 },
    });
    expect(result.grossProfit).toBe(-30000);
    expect(result.marginPercent).toBe(-30);
    expect(result.marginBand).toBe('CRITICAL');
  });

  it('does not invent a margin when a trip carries no booking', () => {
    const result = profitability({
      revenue: 0,
      totals: { estimatedCost: 5000, actualCost: 5000, suppliers: 5000, staff: 0, recovery: 0 },
    });
    expect(result.marginPercent).toBe(0);
    expect(result.marginBand).toBe('NO_REVENUE');
  });
});

describe('toProfitabilityRow', () => {
  it('rolls a trip and its costs into one table row', () => {
    const row = toProfitabilityRow({
      id: 'trip-1',
      tripNumber: 'TRP-2026-001',
      name: 'Everest Base Camp',
      status: 'READY',
      startDate: new Date('2026-11-10T00:00:00Z'),
      endDate: new Date('2026-11-23T00:00:00Z'),
      booking: { totalAmount: dec(300000), paidAmount: dec(0), balanceAmount: dec(300000), currency: 'NPR' },
      supplierBookings: [supplier({ actualCost: dec(150000) })],
      staffAssignments: [staff({ agreedRate: dec(50000) })],
      disruptions: [{ recoveryPlan: { estimatedCost: dec(20000), status: 'APPROVED' } }],
    });
    expect(row.totalRevenue).toBe(300000);
    expect(row.totalCost).toBe(220000);
    expect(row.grossProfit).toBe(80000);
    expect(row.marginPercent).toBe(26.67);
    expect(row.marginBand).toBe('HEALTHY');
  });
});

describe('FinanceService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a trip from another workspace', async () => {
    vi.spyOn(FinanceRepository, 'findTrip').mockResolvedValue(null);
    const supplierSpy = vi.spyOn(FinanceRepository, 'listSupplierBookings');
    await expect(FinanceService.calculateTripFinancials('ws-1', 'trip-x')).rejects.toThrow(AppError);
    expect(supplierSpy).not.toHaveBeenCalled();
  });

  it('assembles revenue, costs, variance and breakdown for one trip', async () => {
    vi.spyOn(FinanceRepository, 'findTrip').mockResolvedValue(buildTrip() as never);
    vi.spyOn(FinanceRepository, 'listSupplierBookings').mockResolvedValue([
      supplier({ estimatedCost: dec(180000), actualCost: dec(200000) }),
      supplier({ confirmedCost: dec(40000) }),
    ] as never);
    vi.spyOn(FinanceRepository, 'listStaffAssignments').mockResolvedValue([
      staff({ agreedRate: dec(40000) }),
      staff({ agreedRate: dec(20000), role: 'porter' }),
    ] as never);
    vi.spyOn(FinanceRepository, 'listRecoveryPlans').mockResolvedValue([] as never);

    const financials = await FinanceService.calculateTripFinancials('ws-1', 'trip-1');

    expect(financials.totalRevenue).toBe(300000);
    expect(financials.paidAmount).toBe(120000);
    expect(financials.outstandingAmount).toBe(180000);
    expect(financials.totalActualCost).toBe(300000); // 200k + 40k + 60k
    expect(financials.totalEstimatedCost).toBe(280000); // 180k + 40k (confirmed fallback) + 60k
    expect(financials.grossProfit).toBe(0);
    expect(financials.marginPercent).toBe(0);
    expect(financials.costVariance).toEqual({ amount: 20000, percent: 7.14, exceedsEstimate: true });
    expect(financials.breakdown).toEqual([
      { category: 'Suppliers', amount: 240000, percent: 80 },
      { category: 'Staff', amount: 60000, percent: 20 },
    ]);
    expect(financials.currency).toBe('NPR');
  });

  it('flags exceeding estimates only when actual cost is above budget', async () => {
    vi.spyOn(FinanceRepository, 'findTrip').mockResolvedValue(buildTrip() as never);
    vi.spyOn(FinanceRepository, 'listSupplierBookings').mockResolvedValue([
      supplier({ estimatedCost: dec(200000), actualCost: dec(150000) }),
    ] as never);
    vi.spyOn(FinanceRepository, 'listStaffAssignments').mockResolvedValue([] as never);
    vi.spyOn(FinanceRepository, 'listRecoveryPlans').mockResolvedValue([] as never);

    const financials = await FinanceService.calculateTripFinancials('ws-1', 'trip-1');
    expect(financials.costVariance.amount).toBe(-50000);
    expect(financials.costVariance.exceedsEstimate).toBe(false);
    expect(financials.marginPercent).toBe(50);
  });

  it('summarises the workspace and ranks trips by margin', async () => {
    vi.spyOn(FinanceRepository, 'listTripsWithCosts').mockResolvedValue([
      {
        id: 'trip-a',
        tripNumber: 'TRP-001',
        name: 'Strong margin',
        status: 'READY',
        startDate: new Date('2026-11-01T00:00:00Z'),
        endDate: new Date('2026-11-05T00:00:00Z'),
        booking: { totalAmount: dec(100000), paidAmount: dec(100000), balanceAmount: dec(0), currency: 'NPR' },
        supplierBookings: [supplier({ actualCost: dec(50000) })],
        staffAssignments: [staff({ agreedRate: dec(10000) })],
        disruptions: [],
      },
      {
        id: 'trip-b',
        tripNumber: 'TRP-002',
        name: 'Thin margin',
        status: 'IN_PROGRESS',
        startDate: new Date('2026-12-01T00:00:00Z'),
        endDate: new Date('2026-12-05T00:00:00Z'),
        booking: { totalAmount: dec(100000), paidAmount: dec(25000), balanceAmount: dec(75000), currency: 'NPR' },
        supplierBookings: [supplier({ actualCost: dec(92000) })],
        staffAssignments: [],
        disruptions: [],
      },
      {
        id: 'trip-c',
        tripNumber: 'TRP-003',
        name: 'Nothing booked yet',
        status: 'PLANNING',
        startDate: new Date('2027-01-01T00:00:00Z'),
        endDate: new Date('2027-01-05T00:00:00Z'),
        booking: null,
        supplierBookings: [],
        staffAssignments: [],
        disruptions: [],
      },
    ] as never);

    const summary = await FinanceService.getWorkspaceFinancialSummary('ws-1');

    expect(summary.tripCount).toBe(2); // the empty PLANNING trip is excluded
    expect(summary.totalRevenue).toBe(200000);
    expect(summary.totalPaid).toBe(125000);
    expect(summary.totalOutstanding).toBe(75000);
    expect(summary.totalActualCost).toBe(152000);
    expect(summary.totalActualProfit).toBe(48000);
    expect(summary.overallMarginPercent).toBe(24);
    expect(summary.lowMarginTripCount).toBe(1);
    expect(summary.mostProfitableTrip?.tripId).toBe('trip-a');
    expect(summary.trips.map((trip) => trip.tripId)).toEqual(['trip-a', 'trip-b']);
  });

  it('includes untouched trips when explicitly asked', async () => {
    vi.spyOn(FinanceRepository, 'listTripsWithCosts').mockResolvedValue([
      {
        id: 'trip-c',
        tripNumber: 'TRP-003',
        name: 'Nothing booked yet',
        status: 'PLANNING',
        startDate: new Date('2027-01-01T00:00:00Z'),
        endDate: new Date('2027-01-05T00:00:00Z'),
        booking: null,
        supplierBookings: [],
        staffAssignments: [],
        disruptions: [],
      },
    ] as never);

    const summary = await FinanceService.getWorkspaceFinancialSummary('ws-1', { includeEmpty: true });
    expect(summary.tripCount).toBe(1);
    expect(summary.mostProfitableTrip).toBeNull();
    expect(summary.overallMarginPercent).toBe(0);
  });
});
