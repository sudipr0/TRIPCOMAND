import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppError } from '../../../lib/errors.js';
import { rawPrisma } from '../../../lib/prisma.js';
import { logAuditEvent } from '../../../lib/audit.js';
import { TripRepository } from '../../trip/trip.repository.js';
import { TripTravelerService } from '../trip-traveler.service.js';
import { TripTravelerRepository } from '../trip-traveler.repository.js';

vi.mock('../../../lib/audit.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildTraveler(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'trav-1',
    workspaceId: 'ws-1',
    tripId: 'trip-1',
    customerId: null,
    fullName: 'John Doe',
    email: null,
    phone: null,
    nationality: null,
    dateOfBirth: null,
    passportNumber: 'AB123456',
    passportExpiry: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    dietaryRequirements: null,
    medicalNotes: null,
    insuranceProvider: null,
    insurancePolicyNumber: null,
    isTripLeader: false,
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

const addInput = {
  fullName: 'John Doe',
  passportNumber: 'AB123456',
  isTripLeader: false,
};

describe('TripTravelerService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logAuditEvent).mockClear();
  });

  describe('addTraveler', () => {
    it('asserts the trip exists in the workspace before adding', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(null);
      const createSpy = vi.spyOn(TripTravelerRepository, 'create');
      await expect(
        TripTravelerService.addTraveler('ws-1', 'u1', 'trip-1', addInput as never),
      ).rejects.toThrow(AppError);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects a customer from another workspace (tenant isolation)', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue({ id: 'trip-1' } as never);
      vi.spyOn(rawPrisma.customer, 'findFirst').mockResolvedValue(null);
      const createSpy = vi.spyOn(TripTravelerRepository, 'create');
      await expect(
        TripTravelerService.addTraveler('ws-1', 'u1', 'trip-1', {
          ...addInput,
          customerId: 'cust-foreign',
        } as never),
      ).rejects.toThrow(AppError);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects a second trip leader when one already exists', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue({ id: 'trip-1' } as never);
      vi.spyOn(TripTravelerRepository, 'findLeader').mockResolvedValue(
        buildTraveler({ isTripLeader: true }) as never,
      );
      const createSpy = vi.spyOn(TripTravelerRepository, 'create');
      await expect(
        TripTravelerService.addTraveler('ws-1', 'u1', 'trip-1', {
          ...addInput,
          isTripLeader: true,
        } as never),
      ).rejects.toThrow(AppError);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('creates the traveler and writes audit "trip.traveler.added"', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue({ id: 'trip-1' } as never);
      vi.spyOn(TripTravelerRepository, 'findLeader').mockResolvedValue(null);
      const createSpy = vi
        .spyOn(TripTravelerRepository, 'create')
        .mockResolvedValue(buildTraveler() as never);

      const result = await TripTravelerService.addTraveler(
        'ws-1',
        'u1',
        'trip-1',
        addInput as never,
      );

      expect(createSpy.mock.calls[0][0]).toBe('ws-1');
      expect(createSpy.mock.calls[0][1]).toBe('trip-1');
      expect(result.fullName).toBe('John Doe');
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          userId: 'u1',
          action: 'trip.traveler.added',
          entityType: 'trip_traveler',
        }),
      );
    });
  });

  describe('bulkAddTravelers', () => {
    it('respects leader uniqueness across trip and batch', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue({ id: 'trip-1' } as never);
      vi.spyOn(TripTravelerRepository, 'findLeader').mockResolvedValue(
        buildTraveler({ isTripLeader: true }) as never,
      );
      const createManySpy = vi
        .spyOn(TripTravelerRepository, 'createMany')
        .mockResolvedValue(0);
      await expect(
        TripTravelerService.bulkAddTravelers('ws-1', 'u1', 'trip-1', [
          { fullName: 'Jane Doe', isTripLeader: true },
        ] as never),
      ).rejects.toThrow(AppError);
      expect(createManySpy).not.toHaveBeenCalled();
    });

    it('bulk adds and writes audit "trip.travelers.bulk_added" with count', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue({ id: 'trip-1' } as never);
      vi.spyOn(TripTravelerRepository, 'findLeader').mockResolvedValue(null);
      const createManySpy = vi
        .spyOn(TripTravelerRepository, 'createMany')
        .mockResolvedValue(2);
      vi.spyOn(TripTravelerRepository, 'listByTrip').mockResolvedValue([
        buildTraveler(),
        buildTraveler({ id: 'trav-2', fullName: 'Jane Doe' }),
      ] as never);

      const result = await TripTravelerService.bulkAddTravelers('ws-1', 'u1', 'trip-1', [
        addInput,
        { fullName: 'Jane Doe', isTripLeader: false },
      ] as never);

      expect(createManySpy).toHaveBeenCalledTimes(1);
      expect(result.added).toBe(2);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'trip.travelers.bulk_added',
          details: expect.objectContaining({ count: 2 }),
        }),
      );
    });
  });

  describe('updateTraveler', () => {
    it('throws notFound cross-workspace', async () => {
      vi.spyOn(TripTravelerRepository, 'findById').mockResolvedValue(null);
      const updateSpy = vi.spyOn(TripTravelerRepository, 'update');
      await expect(
        TripTravelerService.updateTraveler('ws-1', 'u1', 'trip-1', 'trav-1', {
          fullName: 'X',
        } as never),
      ).rejects.toThrow(AppError);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('throws notFound when traveler belongs to a different trip', async () => {
      vi.spyOn(TripTravelerRepository, 'findById').mockResolvedValue(
        buildTraveler({ tripId: 'trip-other' }) as never,
      );
      await expect(
        TripTravelerService.updateTraveler('ws-1', 'u1', 'trip-1', 'trav-1', {
          fullName: 'X',
        } as never),
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteTraveler', () => {
    it('throws notFound cross-workspace and writes audit on success', async () => {
      vi.spyOn(TripTravelerRepository, 'findById').mockResolvedValue(null);
      const deleteSpy = vi.spyOn(TripTravelerRepository, 'delete');
      await expect(
        TripTravelerService.deleteTraveler('ws-1', 'u1', 'trip-1', 'trav-1'),
      ).rejects.toThrow(AppError);
      expect(deleteSpy).not.toHaveBeenCalled();

      // Now found — deletion succeeds and audit fires.
      vi.spyOn(TripTravelerRepository, 'findById').mockResolvedValue(
        buildTraveler() as never,
      );
      vi.spyOn(TripTravelerRepository, 'delete').mockResolvedValue(buildTraveler() as never);
      const result = await TripTravelerService.deleteTraveler('ws-1', 'u1', 'trip-1', 'trav-1');
      expect(result).toEqual({ success: true, id: 'trav-1' });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'trip.traveler.deleted' }),
      );
    });
  });

  describe('listTravelers', () => {
    it('tenant isolation: unknown trip in workspace -> notFound, list never called', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(null);
      const listSpy = vi.spyOn(TripTravelerRepository, 'listByTrip');
      await expect(TripTravelerService.listTravelers('ws-1', 'trip-1')).rejects.toThrow(
        AppError,
      );
      expect(listSpy).not.toHaveBeenCalled();
    });
  });
});
