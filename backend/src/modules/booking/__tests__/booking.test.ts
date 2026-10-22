import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppError } from '../../../lib/errors.js';
import { BookingService } from '../booking.service.js';
import { BookingRepository } from '../booking.repository.js';
import { QuotationRepository } from '../../quotation/quotation.repository.js';

vi.mock('../../trip/trip.service.js', () => ({
  TripService: {
    createTripFromBooking: vi.fn().mockResolvedValue({ id: 'trip-1', tripNumber: 'TRP-2026-001' }),
  },
}));

vi.mock('../../../lib/audit.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildQuotation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'quo-1',
    workspaceId: 'ws-1',
    inquiryId: null,
    customerId: 'cust-1',
    quotationNumber: 'QUO-2026-001',
    version: 1,
    trekName: 'ABC 10-Day',
    startDate: new Date('2026-11-01T00:00:00Z'),
    endDate: new Date('2026-11-10T00:00:00Z'),
    groupSize: 2,
    subtotal: 63500,
    discount: 500,
    tax: 1000,
    total: 64000,
    currency: 'NPR',
    status: 'ACCEPTED' as const,
    convertedToBookingId: null,
    lineItems: [],
    versions: [],
    customer: { id: 'cust-1', fullName: 'Jane', email: null, phone: null },
    ...overrides,
  };
}

function buildBooking(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'bkg-1',
    workspaceId: 'ws-1',
    customerId: 'cust-1',
    quotationId: 'quo-1',
    bookingNumber: 'BKG-2026-001',
    trekName: 'ABC 10-Day',
    startDate: new Date('2026-11-01T00:00:00Z'),
    endDate: new Date('2026-11-10T00:00:00Z'),
    groupSize: 2,
    totalAmount: 64000,
    paidAmount: 0,
    balanceAmount: 64000,
    currency: 'NPR',
    status: 'CONFIRMED' as const,
    confirmedAt: new Date(),
    cancelledAt: null,
    cancellationReason: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    payments: [],
    ...overrides,
  };
}

describe('BookingService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createFromQuotation', () => {
    it('requires quotation ACCEPTED', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(
        buildQuotation({ status: 'SENT' }) as never,
      );
      await expect(
        BookingService.createFromQuotation('ws-1', 'u1', 'quo-1'),
      ).rejects.toThrow(AppError);
    });

    it('rejects quotation already converted', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(
        buildQuotation({ convertedToBookingId: 'bkg-9' }) as never,
      );
      await expect(
        BookingService.createFromQuotation('ws-1', 'u1', 'quo-1'),
      ).rejects.toThrow(AppError);
    });

    it('generates BKG-YYYY-NNN format and links quotation', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(buildQuotation() as never);
      vi.spyOn(BookingRepository, 'findByQuotation').mockResolvedValue(null);
      vi.spyOn(BookingRepository, 'generateNumber').mockResolvedValue('BKG-2026-001');
      const createSpy = vi
        .spyOn(BookingRepository, 'create')
        .mockResolvedValue(buildBooking() as never);

      const result = await BookingService.createFromQuotation('ws-1', 'u1', 'quo-1');

      expect(result.booking.bookingNumber).toMatch(/^BKG-\d{4}-\d{3}$/);
      expect(createSpy.mock.calls[0][0]).toBe('ws-1');
      expect(createSpy.mock.calls[0][1].quotationId).toBe('quo-1');
      // balance = total since paidAmount starts at 0
      expect(createSpy.mock.calls[0][1].balanceAmount).toBe(64000);
    });

    it('sets status CONFIRMED with confirmedAt', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(buildQuotation() as never);
      vi.spyOn(BookingRepository, 'findByQuotation').mockResolvedValue(null);
      vi.spyOn(BookingRepository, 'generateNumber').mockResolvedValue('BKG-2026-001');
      const createSpy = vi
        .spyOn(BookingRepository, 'create')
        .mockResolvedValue(buildBooking() as never);

      await BookingService.createFromQuotation('ws-1', 'u1', 'quo-1');

      expect(createSpy.mock.calls[0][1].status).toBe('CONFIRMED');
      expect(createSpy.mock.calls[0][1].confirmedAt).toBeInstanceOf(Date);
    });

    it('cannot create from another workspace quotation (tenant isolation)', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(null);
      await expect(
        BookingService.createFromQuotation('ws-1', 'u1', 'quo-other-ws'),
      ).rejects.toThrow(AppError);
    });
  });

  describe('cancelBooking', () => {
    it('sets CANCELLED with cancelledAt and reason', async () => {
      vi.spyOn(BookingRepository, 'findById').mockResolvedValue(buildBooking() as never);
      const updateSpy = vi
        .spyOn(BookingRepository, 'updateStatus')
        .mockResolvedValue(
          buildBooking({
            status: 'CANCELLED',
            cancellationReason: 'client cancelled',
            cancelledAt: new Date(),
          }) as never,
        );

      const result = await BookingService.cancelBooking('ws-1', 'bkg-1', 'u1', 'client cancelled');

      expect(updateSpy.mock.calls[0][2]).toBe('CANCELLED');
      expect(updateSpy.mock.calls[0][3]).toEqual(
        expect.objectContaining({ cancellationReason: 'client cancelled' }),
      );
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('completeBooking', () => {
    it('sets COMPLETED', async () => {
      vi.spyOn(BookingRepository, 'findById').mockResolvedValue(buildBooking() as never);
      const updateSpy = vi
        .spyOn(BookingRepository, 'updateStatus')
        .mockResolvedValue(buildBooking({ status: 'COMPLETED' }) as never);

      const result = await BookingService.completeBooking('ws-1', 'bkg-1', 'u1');

      expect(updateSpy.mock.calls[0][2]).toBe('COMPLETED');
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('getBooking', () => {
    it('throws notFound across workspaces', async () => {
      vi.spyOn(BookingRepository, 'findById').mockResolvedValue(null);
      await expect(BookingService.getBooking('ws-1', 'bkg-1')).rejects.toThrow(AppError);
    });
  });
});
