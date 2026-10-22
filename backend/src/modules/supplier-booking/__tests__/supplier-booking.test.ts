import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppError } from '../../../lib/errors.js';
import { logAuditEvent } from '../../../lib/audit.js';
import { TripRepository } from '../../trip/trip.repository.js';
import { SupplierBookingService } from '../supplier-booking.service.js';
import { SupplierRepository } from '../../supplier/supplier.repository.js';
import { SupplierBookingRepository } from '../supplier-booking.repository.js';
import { ItineraryRepository } from '../../itinerary/itinerary.repository.js';

vi.mock('../../../lib/audit.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildTrip(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'trip-1',
    workspaceId: 'ws-1',
    tripNumber: 'TRP-2026-001',
    name: 'EBC 12-Day October',
    startDate: new Date('2026-10-05T00:00:00Z'),
    endDate: new Date('2026-10-16T00:00:00Z'),
    groupSize: 4,
    status: 'PLANNING' as const,
    operationsManagerId: 'opm-1',
    leadGuideId: null,
    publishedItineraryVersionId: null,
    notes: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    travelers: [],
    itineraryDays: [],
    ...overrides,
  };
}

function buildSupplier(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sup-1',
    workspaceId: 'ws-1',
    name: 'Namche Hilltop Lodge',
    code: 'NHL-01',
    category: 'ACCOMMODATION' as const,
    region: 'Khumbu',
    status: 'ACTIVE' as const,
    deletedAt: null,
    ...overrides,
  };
}

function buildDay(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'day-1',
    workspaceId: 'ws-1',
    tripId: 'trip-1',
    dayNumber: 2,
    title: 'Phakding to Namche',
    ...overrides,
  };
}

function buildBooking(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sbkg-1',
    workspaceId: 'ws-1',
    tripId: 'trip-1',
    supplierId: 'sup-1',
    itineraryDayId: null,
    serviceType: 'ACCOMMODATION' as const,
    description: 'Twin room for 4 travelers, 2 nights',
    code: null,
    serviceDate: new Date('2026-10-06T00:00:00Z'),
    endDate: new Date('2026-10-08T00:00:00Z'),
    startTime: null,
    endTime: null,
    quantity: 2,
    unit: 'rooms',
    estimatedCost: 8000,
    confirmedCost: null,
    actualCost: null,
    currency: 'NPR',
    status: 'INQUIRY' as const,
    confirmationNumber: null,
    confirmedAt: null,
    confirmedById: null,
    cancellationPolicy: null,
    cancellationDeadline: new Date('2026-09-28T00:00:00Z'),
    cancelledAt: null,
    cancelledById: null,
    cancellationReason: null,
    notes: null,
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    supplier: {
      id: 'sup-1',
      name: 'Namche Hilltop Lodge',
      category: 'ACCOMMODATION' as const,
      phone: '+977-9800000001',
    },
    itineraryDay: null,
    trip: {
      id: 'trip-1',
      tripNumber: 'TRP-2026-001',
      name: 'EBC 12-Day October',
      startDate: new Date('2026-10-05T00:00:00Z'),
      endDate: new Date('2026-10-16T00:00:00Z'),
    },
    ...overrides,
  };
}

const createInput = {
  tripId: 'trip-1',
  supplierId: 'sup-1',
  serviceType: 'ACCOMMODATION' as const,
  description: 'Twin room for 4 travelers, 2 nights',
  serviceDate: '2026-10-06T00:00:00.000Z',
  endDate: '2026-10-08T00:00:00.000Z',
  quantity: 2,
  unit: 'rooms',
  estimatedCost: 8000,
  currency: 'NPR',
  cancellationDeadline: '2026-09-28T00:00:00.000Z',
};

describe('SupplierBookingService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logAuditEvent).mockClear();
  });

  describe('createBooking', () => {
    it('scopes to workspace and asserts trip exists in workspace', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(null);
      const createSpy = vi.spyOn(SupplierBookingRepository, 'create');

      await expect(
        SupplierBookingService.createBooking('ws-1', 'u-1', createInput),
      ).rejects.toThrow(AppError);

      expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects supplier from another workspace', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(null);

      await expect(
        SupplierBookingService.createBooking('ws-1', 'u-1', createInput),
      ).rejects.toThrow(AppError);
    });

    it('rejects trip in IN_PROGRESS status', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(
        buildTrip({ status: 'IN_PROGRESS' }) as never,
      );
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(buildSupplier() as never);

      await expect(
        SupplierBookingService.createBooking('ws-1', 'u-1', createInput),
      ).rejects.toThrow(AppError);
    });

    it('validates serviceDate within trip range', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(buildSupplier() as never);

      await expect(
        SupplierBookingService.createBooking('ws-1', 'u-1', {
          ...createInput,
          serviceDate: '2026-10-01T00:00:00.000Z', // Before trip starts on 2026-10-05
        }),
      ).rejects.toThrow(AppError);
    });

    it('rejects cancellationDeadline > serviceDate', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(buildSupplier() as never);

      await expect(
        SupplierBookingService.createBooking('ws-1', 'u-1', {
          ...createInput,
          cancellationDeadline: '2026-10-07T00:00:00.000Z', // After serviceDate 2026-10-06
        }),
      ).rejects.toThrow(AppError);
    });

    it('with itineraryDayId validates day belongs to the trip', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(buildSupplier() as never);
      vi.spyOn(ItineraryRepository, 'findDayById').mockResolvedValue(
        buildDay({ tripId: 'trip-other' }) as never,
      );

      await expect(
        SupplierBookingService.createBooking('ws-1', 'u-1', {
          ...createInput,
          itineraryDayId: 'day-1',
        }),
      ).rejects.toThrow(AppError);
    });

    it('creates booking with status INQUIRY and writes audit', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(buildSupplier() as never);
      const createSpy = vi
        .spyOn(SupplierBookingRepository, 'create')
        .mockResolvedValue(buildBooking() as never);

      const result = await SupplierBookingService.createBooking(
        'ws-1',
        'u-1',
        createInput,
      );

      expect(createSpy).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({ status: 'INQUIRY', estimatedCost: 8000 }),
      );
      expect(result.id).toBe('sbkg-1');
      expect(result.status).toBe('INQUIRY');
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'supplier_booking.created',
          entityType: 'supplier_booking',
        }),
      );
    });
  });

  describe('confirmBooking', () => {
    it('requires confirmationNumber (non-empty)', async () => {
      vi.spyOn(SupplierBookingRepository, 'findById').mockResolvedValue(
        buildBooking({ status: 'QUOTED' }) as never,
      );

      await expect(
        SupplierBookingService.confirmBooking('ws-1', 'u-1', 'sbkg-1', {
          confirmationNumber: '   ',
          confirmedCost: 8400,
        }),
      ).rejects.toThrow(AppError);
    });

    it('rejects confirmation from INQUIRY status (must be QUOTED or BOOKED)', async () => {
      vi.spyOn(SupplierBookingRepository, 'findById').mockResolvedValue(
        buildBooking({ status: 'INQUIRY' }) as never,
      );

      await expect(
        SupplierBookingService.confirmBooking('ws-1', 'u-1', 'sbkg-1', {
          confirmationNumber: 'HILLTOP-1234',
          confirmedCost: 8400,
        }),
      ).rejects.toThrow(AppError);
    });

    it('transitions QUOTED -> CONFIRMED and sets confirmedAt and confirmedById', async () => {
      vi.spyOn(SupplierBookingRepository, 'findById').mockResolvedValue(
        buildBooking({ status: 'QUOTED' }) as never,
      );
      const updateStatusSpy = vi
        .spyOn(SupplierBookingRepository, 'updateStatus')
        .mockResolvedValue(
          buildBooking({
            status: 'CONFIRMED',
            confirmationNumber: 'HILLTOP-1234',
            confirmedCost: 8400,
            confirmedAt: new Date(),
            confirmedById: 'u-1',
          }) as never,
        );

      const result = await SupplierBookingService.confirmBooking(
        'ws-1',
        'u-1',
        'sbkg-1',
        {
          confirmationNumber: 'HILLTOP-1234',
          confirmedCost: 8400,
        },
      );

      expect(updateStatusSpy).toHaveBeenCalledWith(
        'sbkg-1',
        'ws-1',
        'CONFIRMED',
        expect.objectContaining({
          confirmationNumber: 'HILLTOP-1234',
          confirmedCost: 8400,
          confirmedById: 'u-1',
        }),
      );
      expect(result.status).toBe('CONFIRMED');
      expect(result.confirmationNumber).toBe('HILLTOP-1234');
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'supplier_booking.confirmed',
          entityType: 'supplier_booking',
        }),
      );
    });
  });

  describe('cancelBooking', () => {
    it('sets CANCELLED and records reason', async () => {
      vi.spyOn(SupplierBookingRepository, 'findById').mockResolvedValue(
        buildBooking({ status: 'CONFIRMED' }) as never,
      );
      const cancelSpy = vi
        .spyOn(SupplierBookingRepository, 'cancel')
        .mockResolvedValue(
          buildBooking({
            status: 'CANCELLED',
            cancellationReason: 'Bad weather cancellation',
          }) as never,
        );

      const result = await SupplierBookingService.cancelBooking(
        'ws-1',
        'u-1',
        'sbkg-1',
        { reason: 'Bad weather cancellation' },
      );

      expect(cancelSpy).toHaveBeenCalledWith(
        'sbkg-1',
        'ws-1',
        'u-1',
        'Bad weather cancellation',
      );
      expect(result.status).toBe('CANCELLED');
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'supplier_booking.cancelled',
          details: expect.objectContaining({ reason: 'Bad weather cancellation' }),
        }),
      );
    });

    it('rejects cancellation on COMPLETED booking', async () => {
      vi.spyOn(SupplierBookingRepository, 'findById').mockResolvedValue(
        buildBooking({ status: 'COMPLETED' }) as never,
      );

      await expect(
        SupplierBookingService.cancelBooking('ws-1', 'u-1', 'sbkg-1', {
          reason: 'Test reason',
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('recordActualCost', () => {
    it('only allowed on IN_PROGRESS or COMPLETED', async () => {
      vi.spyOn(SupplierBookingRepository, 'findById').mockResolvedValue(
        buildBooking({ status: 'CONFIRMED' }) as never,
      );

      await expect(
        SupplierBookingService.recordActualCost('ws-1', 'u-1', 'sbkg-1', {
          actualCost: 8600,
        }),
      ).rejects.toThrow(AppError);
    });

    it('records actual cost on IN_PROGRESS and writes audit', async () => {
      vi.spyOn(SupplierBookingRepository, 'findById').mockResolvedValue(
        buildBooking({ status: 'IN_PROGRESS' }) as never,
      );
      const recordSpy = vi
        .spyOn(SupplierBookingRepository, 'recordActualCost')
        .mockResolvedValue(
          buildBooking({ status: 'IN_PROGRESS', actualCost: 8600 }) as never,
        );

      const result = await SupplierBookingService.recordActualCost(
        'ws-1',
        'u-1',
        'sbkg-1',
        { actualCost: 8600, notes: 'Extra night added' },
      );

      expect(recordSpy).toHaveBeenCalledWith('sbkg-1', 'ws-1', 8600, 'Extra night added');
      expect(result.actualCost).toBe('8600');
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'supplier_booking.actual_cost_recorded' }),
      );
    });
  });

  describe('getUpcomingDeadlines', () => {
    it('filters deadlines approaching within hours window', async () => {
      const deadlineBooking = buildBooking({
        status: 'CONFIRMED',
        cancellationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      const deadlinesSpy = vi
        .spyOn(SupplierBookingRepository, 'findUpcomingCancellationDeadlines')
        .mockResolvedValue([deadlineBooking] as never);

      const result = await SupplierBookingService.getUpcomingDeadlines('ws-1', 48);

      expect(deadlinesSpy).toHaveBeenCalledWith('ws-1', 48);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sbkg-1');
    });
  });

  describe('tenant isolation', () => {
    it('cannot get booking from another workspace', async () => {
      vi.spyOn(SupplierBookingRepository, 'findById').mockResolvedValue(null);

      await expect(
        SupplierBookingService.getBooking('ws-1', 'sbkg-foreign'),
      ).rejects.toThrow(AppError);
    });
  });
});
