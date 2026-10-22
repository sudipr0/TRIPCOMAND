import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppError } from '../../../lib/errors.js';
import { rawPrisma } from '../../../lib/prisma.js';
import { QuotationService } from '../quotation.service.js';
import { QuotationRepository } from '../quotation.repository.js';
import { BookingService } from '../../booking/booking.service.js';
import { InquiryRepository } from '../../inquiry/inquiry.repository.js';

vi.mock('../../../lib/audit.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../booking/booking.service.js', () => ({
  BookingService: {
    createFromQuotation: vi.fn().mockResolvedValue({ id: 'bkg-1', bookingNumber: 'BKG-2026-001' }),
  },
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
    inclusions: [],
    exclusions: [],
    terms: null,
    notes: null,
    status: 'DRAFT' as const,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    convertedToBookingId: null,
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    lineItems: [],
    versions: [],
    customer: { id: 'cust-1', fullName: 'Jane Smith', email: null, phone: null },
    ...overrides,
  };
}

const validInput = {
  customerId: 'cust-1',
  trekName: 'ABC 10-Day',
  startDate: '2026-11-01T00:00:00Z',
  endDate: '2026-11-10T00:00:00Z',
  groupSize: 2,
  discount: 500,
  tax: 1000,
  lineItems: [
    { category: 'guide', description: 'Lead guide', quantity: 10, unit: 'day', unitPrice: 5000, isOptional: false },
    { category: 'accommodation', description: 'Tea house', quantity: 9, unit: 'night', unitPrice: 1500, isOptional: false },
  ],
};

describe('QuotationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(BookingService.createFromQuotation).mockResolvedValue({
      id: 'bkg-1',
      bookingNumber: 'BKG-2026-001',
    } as never);
  });

  describe('createQuotation', () => {
    it('creates with valid input, generates number and audits', async () => {
      vi.spyOn(rawPrisma.customer, 'findFirst').mockResolvedValue({ id: 'cust-1' } as never);
      vi.spyOn(QuotationRepository, 'generateNumber').mockResolvedValue('QUO-2026-001');
      const createSpy = vi
        .spyOn(QuotationRepository, 'create')
        .mockResolvedValue(buildQuotation() as never);
      vi.spyOn(QuotationRepository, 'createVersionSnapshot').mockResolvedValue(undefined);

      const result = await QuotationService.createQuotation('ws-1', 'u1', validInput as never);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy.mock.calls[0][0]).toBe('ws-1');
      expect(createSpy.mock.calls[0][1].quotationNumber).toBe('QUO-2026-001');
      expect(result.quotationNumber).toBe('QUO-2026-001');
    });

    it('throws notFound when customer is missing', async () => {
      vi.spyOn(rawPrisma.customer, 'findFirst').mockResolvedValue(null);
      await expect(
        QuotationService.createQuotation('ws-1', 'u1', validInput as never),
      ).rejects.toThrow(AppError);
    });

    it('throws notFound (tenant isolation) for a customer from another workspace', async () => {
      vi.spyOn(rawPrisma.customer, 'findFirst').mockResolvedValue(null);
      await expect(
        QuotationService.createQuotation('ws-1', 'u1', validInput as never),
      ).rejects.toThrow(AppError);
    });

    it('computes subtotal and total correctly from line items', async () => {
      vi.spyOn(rawPrisma.customer, 'findFirst').mockResolvedValue({ id: 'cust-1' } as never);
      vi.spyOn(QuotationRepository, 'generateNumber').mockResolvedValue('QUO-2026-001');
      const createSpy = vi
        .spyOn(QuotationRepository, 'create')
        .mockResolvedValue(buildQuotation() as never);
      vi.spyOn(QuotationRepository, 'createVersionSnapshot').mockResolvedValue(undefined);

      await QuotationService.createQuotation('ws-1', 'u1', validInput as never);

      const data = createSpy.mock.calls[0][1];
      // 10*5000 + 9*1500 = 63500; total = 63500 - 500 + 1000 = 64000
      expect(data.subtotal).toBe(63500);
      expect(data.total).toBe(64000);
    });

    it('rejects an inquiry belonging to another workspace/customer', async () => {
      vi.spyOn(rawPrisma.customer, 'findFirst').mockResolvedValue({ id: 'cust-1' } as never);
      vi.spyOn(InquiryRepository, 'findById').mockResolvedValue(null);
      await expect(
        QuotationService.createQuotation('ws-1', 'u1', {
          ...validInput,
          inquiryId: 'inq-other',
        } as never),
      ).rejects.toThrow(AppError);
    });
  });

  describe('updateQuotation', () => {
    it('creates a new version snapshot and increments version', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(buildQuotation() as never);
      const snapshotSpy = vi
        .spyOn(QuotationRepository, 'createVersionSnapshot')
        .mockResolvedValue(undefined);
      const updateSpy = vi
        .spyOn(QuotationRepository, 'update')
        .mockResolvedValue(buildQuotation({ version: 2 }) as never);
      vi.spyOn(QuotationRepository, 'updateStatus').mockResolvedValue(
        buildQuotation({ version: 2 }) as never,
      );

      const result = await QuotationService.updateQuotation('ws-1', 'quo-1', 'u1', {
        notes: 'updated',
      } as never);

      expect(snapshotSpy).toHaveBeenCalledWith('quo-1', 1, expect.anything(), 'u1', expect.anything());
      expect(updateSpy.mock.calls[0][2].version).toBe(2);
      expect(result.version).toBe(2);
    });

    it('throws notFound for a quotation in another workspace', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(null);
      await expect(
        QuotationService.updateQuotation('ws-1', 'missing', 'u1', { notes: 'x' } as never),
      ).rejects.toThrow(AppError);
    });
  });

  describe('status transitions', () => {
    it('send transitions DRAFT -> SENT', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(buildQuotation() as never);
      const updateSpy = vi
        .spyOn(QuotationRepository, 'updateStatus')
        .mockResolvedValue(buildQuotation({ status: 'SENT', sentAt: new Date() }) as never);

      const result = await QuotationService.sendQuotation('ws-1', 'quo-1', 'u1');

      expect(updateSpy.mock.calls[0][2]).toBe('SENT');
      expect(result.status).toBe('SENT');
    });

    it('accept transitions SENT -> ACCEPTED', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(
        buildQuotation({ status: 'SENT' }) as never,
      );
      const updateSpy = vi
        .spyOn(QuotationRepository, 'updateStatus')
        .mockResolvedValue(buildQuotation({ status: 'ACCEPTED', acceptedAt: new Date() }) as never);

      const result = await QuotationService.acceptQuotation('ws-1', 'quo-1', 'u1');

      expect(updateSpy.mock.calls[0][2]).toBe('ACCEPTED');
      expect(result.status).toBe('ACCEPTED');
    });

    it('reject transitions SENT -> REJECTED with reason', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(
        buildQuotation({ status: 'SENT' }) as never,
      );
      const updateSpy = vi
        .spyOn(QuotationRepository, 'updateStatus')
        .mockResolvedValue(
          buildQuotation({ status: 'REJECTED', rejectionReason: 'too expensive' }) as never,
        );

      await QuotationService.rejectQuotation('ws-1', 'quo-1', 'u1', 'too expensive');

      expect(updateSpy.mock.calls[0][2]).toBe('REJECTED');
      expect(updateSpy.mock.calls[0][3]).toEqual(
        expect.objectContaining({ rejectionReason: 'too expensive' }),
      );
    });

    it('send rejects a quotation not in DRAFT', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(
        buildQuotation({ status: 'ACCEPTED' }) as never,
      );
      await expect(QuotationService.sendQuotation('ws-1', 'quo-1', 'u1')).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('convertToBooking', () => {
    it('forbidden when quotation is not ACCEPTED', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(
        buildQuotation({ status: 'SENT' }) as never,
      );
      await expect(QuotationService.convertToBooking('ws-1', 'quo-1', 'u1')).rejects.toThrow(
        AppError,
      );
      expect(BookingService.createFromQuotation).not.toHaveBeenCalled();
    });

    it('conflict when already converted', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(
        buildQuotation({ status: 'ACCEPTED', convertedToBookingId: 'bkg-1' }) as never,
      );
      await expect(QuotationService.convertToBooking('ws-1', 'quo-1', 'u1')).rejects.toThrow(
        AppError,
      );
    });

    it('delegates to BookingService and audits on success', async () => {
      vi.spyOn(QuotationRepository, 'findById')
        .mockResolvedValueOnce(buildQuotation({ status: 'ACCEPTED' }) as never)
        .mockResolvedValueOnce(
          buildQuotation({ status: 'ACCEPTED', convertedToBookingId: 'bkg-1' }) as never,
        );
      vi.spyOn(QuotationRepository, 'updateStatus').mockResolvedValue(
        buildQuotation({ status: 'ACCEPTED' }) as never,
      );
      vi.spyOn(InquiryRepository, 'update').mockResolvedValue({} as never);

      vi.mocked(BookingService.createFromQuotation).mockResolvedValue({
        booking: { id: 'bkg-1', bookingNumber: 'BKG-2026-001' },
        trip: { id: 'trip-1', tripNumber: 'TRP-2026-001' },
      } as never);

      const result = await QuotationService.convertToBooking('ws-1', 'quo-1', 'u1');

      expect(BookingService.createFromQuotation).toHaveBeenCalledWith('ws-1', 'u1', 'quo-1');
      expect((result.booking as { id: string }).id).toBe('bkg-1');
    });
  });

  describe('getQuotation', () => {
    it('throws notFound across workspaces', async () => {
      vi.spyOn(QuotationRepository, 'findById').mockResolvedValue(null);
      await expect(QuotationService.getQuotation('ws-1', 'quo-1')).rejects.toThrow(AppError);
    });
  });
});
