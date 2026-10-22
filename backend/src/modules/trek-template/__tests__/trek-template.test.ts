import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Prisma } from '@prisma/client';

import { AppError } from '../../../lib/errors.js';
import { TrekTemplateService } from '../trek-template.service.js';
import { TrekTemplateRepository } from '../trek-template.repository.js';

vi.mock('../../../lib/audit.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildDay(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'day-1',
    templateId: 'tpl-1',
    dayNumber: 1,
    title: 'Arrival in Kathmandu',
    description: null,
    startLocation: null,
    endLocation: 'Kathmandu',
    altitude: 1400,
    walkingHours: null,
    accommodation: null,
    meals: [],
    activities: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildTemplate(
  overrides: Partial<Prisma.TrekTemplateGetPayload<{ include: { destination: true; days: true } }>> = {}
): Prisma.TrekTemplateGetPayload<{ include: { destination: true; days: true } }> {
  return {
    id: 'tpl-1',
    workspaceId: 'ws-1',
    destinationId: null,
    name: 'Everest Base Camp Trek',
    code: null,
    description: null,
    region: 'Khumbu',
    difficulty: 'MODERATE' as const,
    durationDays: 12,
    maxAltitude: 5545,
    bestSeasons: ['Spring', 'Autumn'],
    basePrice: null,
    basePriceCurrency: 'NPR',
    requiredDocuments: [],
    packingList: null,
    preparationNotes: null,
    inclusions: [],
    exclusions: [],
    terms: null,
    status: 'DRAFT' as const,
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    destination: null,
    days: [buildDay()],
    ...overrides,
  };
}

describe('TrekTemplateService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('listTemplates', () => {
    it('scopes the repository query to the supplied workspaceId', async () => {
      const listSpy = vi
        .spyOn(TrekTemplateRepository, 'listTemplates')
        .mockResolvedValue({ total: 1, items: [buildTemplate()] });

      const result = await TrekTemplateService.listTemplates('ws-1', {
        limit: 50,
        offset: 0,
      });

      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({ limit: 50, offset: 0 })
      );
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe('tpl-1');
      expect(result.items[0].workspaceId).toBe('ws-1');
    });
  });

  describe('getTemplate', () => {
    it('throws not found when template does not exist in workspace', async () => {
      vi.spyOn(TrekTemplateRepository, 'findById').mockResolvedValue(null);

      await expect(
        TrekTemplateService.getTemplate('ws-1', 'missing')
      ).rejects.toThrow(AppError);
    });
  });

  describe('createTemplate', () => {
    it('throws conflict when a template with the same name exists in workspace', async () => {
      vi.spyOn(TrekTemplateRepository, 'findByName').mockResolvedValue(
        buildTemplate()
      );

      await expect(
        TrekTemplateService.createTemplate('ws-1', 'u1', {
          name: 'Everest Base Camp Trek',
          difficulty: 'MODERATE',
          durationDays: 12,
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('addDay', () => {
    it('throws not found when template is not in the workspace', async () => {
      vi.spyOn(TrekTemplateRepository, 'findById').mockResolvedValue(null);

      await expect(
        TrekTemplateService.addDay('ws-1', 'tpl-in-ws-2', 'u1', {
          dayNumber: 1,
          title: 'Day 1',
        })
      ).rejects.toThrow(AppError);
    });

    it('throws conflict when day number already exists in the template', async () => {
      vi.spyOn(TrekTemplateRepository, 'findById').mockResolvedValue(
        buildTemplate()
      );
      vi.spyOn(TrekTemplateRepository, 'findDayByNumber').mockResolvedValue(
        buildDay()
      );

      await expect(
        TrekTemplateService.addDay('ws-1', 'tpl-1', 'u1', {
          dayNumber: 1,
          title: 'Duplicate Day',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('reorderDays', () => {
    it('rejects when a dayId belongs to a different template', async () => {
      vi.spyOn(TrekTemplateRepository, 'findById').mockResolvedValue(
        buildTemplate()
      );
      vi.spyOn(TrekTemplateRepository, 'findDaysByIds').mockResolvedValue([
        buildDay({ id: 'day-1', templateId: 'tpl-2' }),
      ]);
      const reorderSpy = vi.spyOn(TrekTemplateRepository, 'reorderDays');

      await expect(
        TrekTemplateService.reorderDays('ws-1', 'tpl-1', 'u1', {
          items: [{ id: 'day-1', dayNumber: 1 }],
        })
      ).rejects.toThrow(AppError);

      expect(reorderSpy).not.toHaveBeenCalled();
    });

    it('rejects when template is not in the workspace', async () => {
      vi.spyOn(TrekTemplateRepository, 'findById').mockResolvedValue(null);
      const reorderSpy = vi.spyOn(TrekTemplateRepository, 'reorderDays');

      await expect(
        TrekTemplateService.reorderDays('ws-1', 'tpl-in-ws-2', 'u1', {
          items: [{ id: 'day-1', dayNumber: 1 }],
        })
      ).rejects.toThrow(AppError);

      expect(reorderSpy).not.toHaveBeenCalled();
    });
  });

  describe('deleteTemplate', () => {
    it('throws not found when template is not in the workspace', async () => {
      vi.spyOn(TrekTemplateRepository, 'findById').mockResolvedValue(null);

      await expect(
        TrekTemplateService.deleteTemplate('ws-1', 'missing', 'u1')
      ).rejects.toThrow(AppError);
    });
  });

  describe('tenant isolation', () => {
    it('does not return templates belonging to another workspace', async () => {
      vi.spyOn(TrekTemplateRepository, 'findById').mockResolvedValue(null);

      await expect(
        TrekTemplateService.getTemplate('ws-1', 'tpl-in-ws-2')
      ).rejects.toThrow(AppError);

      expect(TrekTemplateRepository.findById).toHaveBeenCalledWith(
        'tpl-in-ws-2',
        'ws-1'
      );
    });

    it('rejects cross-workspace delete attempts', async () => {
      vi.spyOn(TrekTemplateRepository, 'findById').mockResolvedValue(null);
      const softDeleteSpy = vi.spyOn(TrekTemplateRepository, 'softDelete');

      await expect(
        TrekTemplateService.deleteTemplate('ws-1', 'tpl-in-ws-2', 'u1')
      ).rejects.toThrow(AppError);

      expect(softDeleteSpy).not.toHaveBeenCalled();
    });
  });
});
