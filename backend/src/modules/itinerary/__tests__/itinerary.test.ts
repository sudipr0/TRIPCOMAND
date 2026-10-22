import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppError } from '../../../lib/errors.js';
import { rawPrisma } from '../../../lib/prisma.js';
import { logAuditEvent } from '../../../lib/audit.js';
import { ItineraryService } from '../itinerary.service.js';
import { TripRepository } from '../../trip/trip.repository.js';
import { ItineraryRepository } from '../itinerary.repository.js';

vi.mock('../../../lib/audit.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildDay(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'day-1',
    workspaceId: 'ws-1',
    tripId: 'trip-1',
    dayNumber: 1,
    title: 'Arrive Kathmandu',
    description: null,
    location: null,
    altitude: 1400,
    startTime: null,
    endTime: null,
    walkingHours: null,
    accommodation: 'Hotel',
    meals: ['dinner'],
    activities: ['briefing'],
    clientVisible: true,
    internalNotes: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildVersion(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'ver-1',
    workspaceId: 'ws-1',
    tripId: 'trip-1',
    version: 1,
    status: 'PUBLISHED' as const,
    snapshot: { days: [], publishedAt: new Date().toISOString(), dayCount: 1 },
    publishedAt: new Date(),
    publishedById: 'u1',
    changeNotes: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function buildTrip(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'trip-1',
    workspaceId: 'ws-1',
    bookingId: null,
    customerId: 'cust-1',
    tripNumber: 'TRP-2026-001',
    name: 'EBC 12-Day October',
    startDate: new Date(),
    endDate: new Date(),
    groupSize: 4,
    status: 'PLANNING' as const,
    operationsManagerId: 'u9',
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

const dayInput = {
  dayNumber: 1,
  title: 'Arrive Kathmandu',
  altitude: 1400,
  meals: ['dinner'],
  activities: ['briefing'],
};

describe('ItineraryService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logAuditEvent).mockClear();
  });

  describe('createDay', () => {
    it('rejects when trip status is not PLANNING (itinerary locked)', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(
        buildTrip({ status: 'READY' }) as never,
      );
      const createSpy = vi.spyOn(ItineraryRepository, 'createDay');
      await expect(
        ItineraryService.createDay('ws-1', 'u1', 'trip-1', dayInput as never),
      ).rejects.toThrow(AppError);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects a duplicate dayNumber', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(ItineraryRepository, 'findDayByNumber').mockResolvedValue(
        buildDay() as never,
      );
      const createSpy = vi.spyOn(ItineraryRepository, 'createDay');
      await expect(
        ItineraryService.createDay('ws-1', 'u1', 'trip-1', dayInput as never),
      ).rejects.toThrow(AppError);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('creates the day and writes audit "trip.itinerary.day.added"', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(ItineraryRepository, 'findDayByNumber').mockResolvedValue(null);
      const createSpy = vi
        .spyOn(ItineraryRepository, 'createDay')
        .mockResolvedValue(buildDay() as never);

      const result = await ItineraryService.createDay('ws-1', 'u1', 'trip-1', dayInput as never);

      expect(createSpy.mock.calls[0][0]).toBe('ws-1');
      expect(createSpy.mock.calls[0][1]).toBe('trip-1');
      expect(result.dayNumber).toBe(1);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'trip.itinerary.day.added' }),
      );
    });
  });

  describe('populateFromTemplate', () => {
    it('rejects when the trip already has itinerary days', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(ItineraryRepository, 'listDays').mockResolvedValue([buildDay()] as never);
      const createManySpy = vi.spyOn(ItineraryRepository, 'createManyDays');
      await expect(
        ItineraryService.populateFromTemplate('ws-1', 'u1', 'trip-1', 'tpl-1'),
      ).rejects.toThrow(AppError);
      expect(createManySpy).not.toHaveBeenCalled();
    });

    it('rejects when the template does not exist in the workspace', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(ItineraryRepository, 'listDays').mockResolvedValue([]);
      vi.spyOn(rawPrisma.trekTemplate, 'findFirst').mockResolvedValue(null);
      await expect(
        ItineraryService.populateFromTemplate('ws-1', 'u1', 'trip-1', 'tpl-1'),
      ).rejects.toThrow(AppError);
    });

    it('copies template days in bulk and writes audit', async () => {
      // listDays runs twice: the emptiness pre-check (must be empty), then the read-back.
      vi.spyOn(ItineraryRepository, 'listDays')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          buildDay(),
          buildDay({ id: 'day-2', dayNumber: 2, title: 'Trek to Namche' }),
        ] as never);
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(rawPrisma.trekTemplate, 'findFirst').mockResolvedValue({
        id: 'tpl-1',
        days: [
          {
            dayNumber: 1,
            title: 'Arrive Kathmandu',
            description: null,
            startLocation: 'Kathmandu',
            altitude: 1400,
            walkingHours: null,
            accommodation: 'Hotel',
            meals: ['dinner'],
            activities: ['briefing'],
          },
          {
            dayNumber: 2,
            title: 'Trek to Namche',
            description: null,
            startLocation: 'Phakding',
            altitude: 3440,
            walkingHours: 6,
            accommodation: 'Lodge',
            meals: ['breakfast'],
            activities: ['trek'],
          },
        ],
      } as never);
      const createManySpy = vi
        .spyOn(ItineraryRepository, 'createManyDays')
        .mockResolvedValue(2);

      const result = await ItineraryService.populateFromTemplate(
        'ws-1',
        'u1',
        'trip-1',
        'tpl-1',
      );

      expect(createManySpy.mock.calls[0][2]).toHaveLength(2);
      expect(result).toHaveLength(2);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'trip.itinerary.populated_from_template',
          details: expect.objectContaining({ templateId: 'tpl-1', dayCount: 2 }),
        }),
      );
    });
  });

  describe('updateDay', () => {
    it('updates only days inside the workspace and trip', async () => {
      vi.spyOn(ItineraryRepository, 'findDayById').mockResolvedValue(
        buildDay() as never,
      );
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      const updateSpy = vi
        .spyOn(ItineraryRepository, 'updateDay')
        .mockResolvedValue(buildDay({ title: 'Updated' }) as never);

      const result = await ItineraryService.updateDay(
        'ws-1',
        'u1',
        'trip-1',
        'day-1',
        { title: 'Updated' } as never,
      );

      expect(updateSpy.mock.calls[0][0]).toBe('day-1');
      expect(result.title).toBe('Updated');
    });

    it('throws notFound for a foreign dayId', async () => {
      vi.spyOn(ItineraryRepository, 'findDayById').mockResolvedValue(null);
      await expect(
        ItineraryService.updateDay('ws-1', 'u1', 'trip-1', 'day-foreign', {
          title: 'X',
        } as never),
      ).rejects.toThrow(AppError);
    });
  });

  describe('reorderDays', () => {
    it('validates that all dayIds belong to the trip', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      // Only 1 of 2 requested days found -> foreign id present.
      vi.spyOn(ItineraryRepository, 'findDaysByIds').mockResolvedValue([
        buildDay(),
      ] as never);
      const reorderSpy = vi.spyOn(ItineraryRepository, 'reorderDays');
      await expect(
        ItineraryService.reorderDays('ws-1', 'u1', 'trip-1', [
          { id: 'day-1', dayNumber: 2 },
          { id: 'day-foreign', dayNumber: 1 },
        ]),
      ).rejects.toThrow(AppError);
      expect(reorderSpy).not.toHaveBeenCalled();
    });

    it('rejects a dayId that belongs to another trip', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(ItineraryRepository, 'findDaysByIds').mockResolvedValue([
        buildDay({ tripId: 'trip-other' }),
      ] as never);
      const reorderSpy = vi.spyOn(ItineraryRepository, 'reorderDays');
      await expect(
        ItineraryService.reorderDays('ws-1', 'u1', 'trip-1', [
          { id: 'day-1', dayNumber: 2 },
        ]),
      ).rejects.toThrow(AppError);
      expect(reorderSpy).not.toHaveBeenCalled();
    });

    it('reorders successfully and writes audit', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(ItineraryRepository, 'findDaysByIds').mockResolvedValue([
        buildDay(),
        buildDay({ id: 'day-2', dayNumber: 2 }),
      ] as never);
      const reorderSpy = vi
        .spyOn(ItineraryRepository, 'reorderDays')
        .mockResolvedValue(undefined);
      vi.spyOn(ItineraryRepository, 'listDays').mockResolvedValue([
        buildDay({ dayNumber: 2 }),
        buildDay({ id: 'day-2', dayNumber: 1 }),
      ] as never);

      const result = await ItineraryService.reorderDays('ws-1', 'u1', 'trip-1', [
        { id: 'day-1', dayNumber: 2 },
        { id: 'day-2', dayNumber: 1 },
      ]);

      expect(reorderSpy).toHaveBeenCalledTimes(1);
      expect(result[0].dayNumber).toBe(2);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'trip.itinerary.reordered' }),
      );
    });
  });

  describe('publishItinerary', () => {
    it('rejects an empty itinerary', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(ItineraryRepository, 'listDays').mockResolvedValue([]);
      const createVersionSpy = vi.spyOn(ItineraryRepository, 'createVersion');
      await expect(
        ItineraryService.publishItinerary('ws-1', 'u1', 'trip-1', {} as never),
      ).rejects.toThrow(AppError);
      expect(createVersionSpy).not.toHaveBeenCalled();
    });

    it('creates a PUBLISHED version and sets Trip.publishedItineraryVersionId', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(buildTrip() as never);
      vi.spyOn(ItineraryRepository, 'listDays').mockResolvedValue([buildDay()] as never);
      vi.spyOn(ItineraryRepository, 'markPreviousPublishedArchived').mockResolvedValue(0);
      vi.spyOn(ItineraryRepository, 'nextVersionNumber').mockResolvedValue(1);
      const createVersionSpy = vi
        .spyOn(ItineraryRepository, 'createVersion')
        .mockResolvedValue(buildVersion() as never);
      const setPublishedSpy = vi
        .spyOn(TripRepository, 'setPublishedVersion')
        .mockResolvedValue(
          buildTrip({ publishedItineraryVersionId: 'ver-1' }) as never,
        );

      const result = await ItineraryService.publishItinerary(
        'ws-1',
        'u1',
        'trip-1',
        { changeNotes: 'Initial' } as never,
      );

      expect(createVersionSpy.mock.calls[0][2].status).toBe('PUBLISHED');
      expect(createVersionSpy.mock.calls[0][2].version).toBe(1);
      expect(setPublishedSpy).toHaveBeenCalledWith('trip-1', 'ws-1', 'ver-1');
      expect(result.version).toBe(1);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'trip.itinerary.published',
          details: expect.objectContaining({ version: 1 }),
        }),
      );
    });

    it('archives any prior PUBLISHED version before creating the new one', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(
        buildTrip({ publishedItineraryVersionId: 'ver-old' }) as never,
      );
      vi.spyOn(ItineraryRepository, 'listDays').mockResolvedValue([buildDay()] as never);
      const archiveSpy = vi
        .spyOn(ItineraryRepository, 'markPreviousPublishedArchived')
        .mockResolvedValue(1);
      vi.spyOn(ItineraryRepository, 'nextVersionNumber').mockResolvedValue(2);
      vi.spyOn(ItineraryRepository, 'createVersion').mockResolvedValue(
        buildVersion({ id: 'ver-2', version: 2 }) as never,
      );
      vi.spyOn(TripRepository, 'setPublishedVersion').mockResolvedValue(
        buildTrip() as never,
      );

      await ItineraryService.publishItinerary('ws-1', 'u1', 'trip-1', {} as never);

      expect(archiveSpy).toHaveBeenCalledWith('trip-1', 'ws-1');
    });
  });

  describe('tenant isolation on read paths', () => {
    it('listDays rejects a trip outside the workspace', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(null);
      const listSpy = vi.spyOn(ItineraryRepository, 'listDays');
      await expect(ItineraryService.listDays('ws-1', 'trip-1')).rejects.toThrow(AppError);
      expect(listSpy).not.toHaveBeenCalled();
    });

    it('getDay rejects a day outside the workspace', async () => {
      vi.spyOn(ItineraryRepository, 'findDayById').mockResolvedValue(null);
      await expect(ItineraryService.getDay('ws-1', 'trip-1', 'day-1')).rejects.toThrow(
        AppError,
      );
    });

    it('listVersions rejects a trip outside the workspace', async () => {
      vi.spyOn(TripRepository, 'findById').mockResolvedValue(null);
      await expect(ItineraryService.listVersions('ws-1', 'trip-1')).rejects.toThrow(
        AppError,
      );
    });

    it('getVersion rejects a version from another trip', async () => {
      vi.spyOn(ItineraryRepository, 'findVersionById').mockResolvedValue(
        buildVersion({ tripId: 'trip-other' }) as never,
      );
      await expect(
        ItineraryService.getVersion('ws-1', 'trip-1', 'ver-1'),
      ).rejects.toThrow(AppError);
    });
  });
});
