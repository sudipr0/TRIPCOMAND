import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppError } from '../../../lib/errors.js';
import { rawPrisma } from '../../../lib/prisma.js';
import { logAuditEvent } from '../../../lib/audit.js';
import { InquiryService } from '../inquiry.service.js';
import { InquiryRepository } from '../inquiry.repository.js';

vi.mock('../../../lib/audit.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildInquiry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'inq-1',
    workspaceId: 'ws-1',
    customerId: 'cust-1',
    inquiryNumber: 'INQ-2026-001',
    trekInterest: 'ABC',
    destinationText: null,
    preferredStart: null,
    preferredEnd: null,
    flexibleDates: true,
    groupSize: 2,
    adults: 1,
    children: 0,
    specialRequirements: null,
    budgetExpectation: null,
    budgetCurrency: 'NPR',
    status: 'NEW' as const,
    priority: 'MEDIUM' as const,
    source: null,
    assignedToId: null,
    nextFollowUpAt: null,
    lastContactedAt: null,
    lostReason: null,
    notes: null,
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    activities: [],
    ...overrides,
  };
}

const validInput = {
  customerId: 'cust-1',
  trekInterest: 'ABC',
  groupSize: 2,
};

describe('InquiryService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logAuditEvent).mockClear();
  });

  describe('listInquiries', () => {
    it('scopes the repository query to the supplied workspaceId', async () => {
      const listSpy = vi
        .spyOn(InquiryRepository, 'listInquiries')
        .mockResolvedValue({ total: 1, items: [buildInquiry()] });

      const result = await InquiryService.listInquiries('ws-1', {
        limit: 50,
        offset: 0,
      });

      expect(listSpy).toHaveBeenCalledWith('ws-1', expect.objectContaining({ limit: 50 }));
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe('inq-1');
    });
  });

  describe('getInquiry', () => {
    it('throws notFound when inquiry does not exist in workspace', async () => {
      vi.spyOn(InquiryRepository, 'findByIdWithActivities').mockResolvedValue(null);
      await expect(InquiryService.getInquiry('ws-1', 'missing')).rejects.toThrow(AppError);
    });

    it('returns the inquiry with ISO date strings when found', async () => {
      vi.spyOn(InquiryRepository, 'findByIdWithActivities').mockResolvedValue(
        buildInquiry() as never,
      );
      const result = await InquiryService.getInquiry('ws-1', 'inq-1');
      expect(result.inquiryNumber).toBe('INQ-2026-001');
      expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('createInquiry', () => {
    it('calls the repository with workspaceId as first argument', async () => {
      vi.spyOn(rawPrisma.customer, 'findFirst').mockResolvedValue({ id: 'cust-1' } as never);
      vi.spyOn(InquiryRepository, 'countByYear').mockResolvedValue(0);
      const createSpy = vi
        .spyOn(InquiryRepository, 'create')
        .mockResolvedValue(buildInquiry() as never);
      vi.spyOn(InquiryRepository, 'createActivity').mockResolvedValue(
        buildInquiry() as never,
      );

      await InquiryService.createInquiry('ws-1', 'u1', validInput as never);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy.mock.calls[0][0]).toBe('ws-1');
    });

    it('throws when customer is not in the workspace (tenant isolation)', async () => {
      vi.spyOn(rawPrisma.customer, 'findFirst').mockResolvedValue(null);
      const createSpy = vi.spyOn(InquiryRepository, 'create');
      await expect(
        InquiryService.createInquiry('ws-1', 'u1', validInput as never),
      ).rejects.toThrow(AppError);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('generates INQ-YYYY-NNN numbering and writes audit "inquiry.created"', async () => {
      vi.spyOn(rawPrisma.customer, 'findFirst').mockResolvedValue({ id: 'cust-1' } as never);
      const countSpy = vi.spyOn(InquiryRepository, 'countByYear').mockResolvedValue(4);
      const createSpy = vi
        .spyOn(InquiryRepository, 'create')
        .mockResolvedValue(buildInquiry({ inquiryNumber: 'INQ-2026-005' }) as never);
      vi.spyOn(InquiryRepository, 'createActivity').mockResolvedValue(
        buildInquiry() as never,
      );

      const result = await InquiryService.createInquiry('ws-1', 'u1', validInput as never);

      // Numbering derived from count: count 4 -> 5th inquiry of the year
      expect(countSpy).toHaveBeenCalledWith('ws-1', new Date().getFullYear());
      expect(createSpy.mock.calls[0][1].inquiryNumber).toBe('INQ-2026-005');
      expect(result.inquiryNumber).toMatch(/^INQ-\d{4}-\d{3}$/);

      expect(logAuditEvent).toHaveBeenCalledTimes(1);
      expect(vi.mocked(logAuditEvent).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          workspaceId: 'ws-1',
          userId: 'u1',
          action: 'inquiry.created',
          entityType: 'inquiry',
        }),
      );
    });
  });

  describe('updateInquiry (assignment path)', () => {
    it('updates assignedToId through the repository', async () => {
      vi.spyOn(InquiryRepository, 'findById').mockResolvedValue(buildInquiry() as never);
      vi.spyOn(rawPrisma.membership, 'findFirst').mockResolvedValue({ id: 'm-1' } as never);
      const updateSpy = vi
        .spyOn(InquiryRepository, 'update')
        .mockResolvedValue(buildInquiry({ assignedToId: 'u9' }) as never);
      vi.spyOn(InquiryRepository, 'createActivity').mockResolvedValue(buildInquiry() as never);

      const result = await InquiryService.updateInquiry('ws-1', 'inq-1', 'u1', {
        assignedToId: 'u9',
      } as never);

      expect(updateSpy.mock.calls[0][2]).toEqual(
        expect.objectContaining({ assignedTo: { connect: { id: 'u9' } } }),
      );
      expect(result.assignedToId).toBe('u9');
    });

    it('writes audit "inquiry.updated" with changed fields', async () => {
      vi.spyOn(InquiryRepository, 'findById').mockResolvedValue(buildInquiry() as never);
      vi.spyOn(rawPrisma.membership, 'findFirst').mockResolvedValue({ id: 'm-1' } as never);
      vi.spyOn(InquiryRepository, 'update').mockResolvedValue(
        buildInquiry({ assignedToId: 'u9' }) as never,
      );
      vi.spyOn(InquiryRepository, 'createActivity').mockResolvedValue(
        buildInquiry() as never,
      );

      await InquiryService.updateInquiry('ws-1', 'inq-1', 'u1', {
        assignedToId: 'u9',
      } as never);

      expect(vi.mocked(logAuditEvent).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          workspaceId: 'ws-1',
          action: 'inquiry.updated',
          entityId: 'inq-1',
        }),
      );
    });
  });

  describe('logActivity', () => {
    it('creates the activity record and writes audit "inquiry.activity.logged"', async () => {
      vi.spyOn(InquiryRepository, 'findById').mockResolvedValue(buildInquiry() as never);
      const createActivitySpy = vi
        .spyOn(InquiryRepository, 'createActivity')
        .mockResolvedValue(buildInquiry() as never);

      await InquiryService.logActivity('ws-1', 'inq-1', 'u1', {
        activityType: 'call.made',
        description: 'Called the client',
      });

      expect(createActivitySpy).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({
          inquiryId: 'inq-1',
          userId: 'u1',
          activityType: 'call.made',
          description: 'Called the client',
        }),
      );
      expect(logAuditEvent).toHaveBeenCalledTimes(1);
      expect(vi.mocked(logAuditEvent).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          workspaceId: 'ws-1',
          userId: 'u1',
          action: 'inquiry.activity.logged',
          entityType: 'inquiry',
          entityId: 'inq-1',
        }),
      );
    });

    it('throws notFound when inquiry is not in the workspace', async () => {
      vi.spyOn(InquiryRepository, 'findById').mockResolvedValue(null);
      await expect(
        InquiryService.logActivity('ws-1', 'missing', 'u1', {
          activityType: 'call.made',
          description: 'x',
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('convertInquiry', () => {
    it('rejects when status is WON', async () => {
      vi.spyOn(InquiryRepository, 'findById').mockResolvedValue(
        buildInquiry({ status: 'WON' }) as never,
      );
      const updateSpy = vi.spyOn(InquiryRepository, 'update');
      await expect(InquiryService.convertInquiry('ws-1', 'inq-1', 'u1')).rejects.toThrow(
        AppError,
      );
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('rejects when status is LOST', async () => {
      vi.spyOn(InquiryRepository, 'findById').mockResolvedValue(
        buildInquiry({ status: 'LOST' }) as never,
      );
      await expect(InquiryService.convertInquiry('ws-1', 'inq-1', 'u1')).rejects.toThrow(
        AppError,
      );
    });

    it('rejects when already QUOTED (double conversion)', async () => {
      vi.spyOn(InquiryRepository, 'findById').mockResolvedValue(
        buildInquiry({ status: 'QUOTED' }) as never,
      );
      await expect(InquiryService.convertInquiry('ws-1', 'inq-1', 'u1')).rejects.toThrow(
        AppError,
      );
    });

    it('sets status QUOTED on success and writes audit "inquiry.converted_to_quotation"', async () => {
      vi.spyOn(InquiryRepository, 'findById').mockResolvedValue(buildInquiry() as never);
      const updateSpy = vi
        .spyOn(InquiryRepository, 'update')
        .mockResolvedValue(buildInquiry({ status: 'QUOTED' }) as never);
      vi.spyOn(InquiryRepository, 'createActivity').mockResolvedValue(
        buildInquiry() as never,
      );

      const result = await InquiryService.convertInquiry('ws-1', 'inq-1', 'u1');

      expect(updateSpy.mock.calls[0][2]).toEqual(
        expect.objectContaining({ status: 'QUOTED' }),
      );
      expect(result).toEqual({
        inquiryId: 'inq-1',
        status: 'QUOTED',
        nextStep: 'Create quotation via POST /quotations',
      });

      expect(vi.mocked(logAuditEvent).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          workspaceId: 'ws-1',
          userId: 'u1',
          action: 'inquiry.converted_to_quotation',
          entityType: 'inquiry',
          entityId: 'inq-1',
        }),
      );
    });

    it('throws notFound when inquiry is in another workspace', async () => {
      vi.spyOn(InquiryRepository, 'findById').mockResolvedValue(null);
      await expect(InquiryService.convertInquiry('ws-1', 'inq-1', 'u1')).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('deleteInquiry', () => {
    it('soft deletes and writes audit "inquiry.deleted"', async () => {
      vi.spyOn(InquiryRepository, 'findById').mockResolvedValue(buildInquiry() as never);
      const softDeleteSpy = vi
        .spyOn(InquiryRepository, 'softDelete')
        .mockResolvedValue(buildInquiry({ deletedAt: new Date() }) as never);

      const result = await InquiryService.deleteInquiry('ws-1', 'inq-1', 'u1');

      expect(softDeleteSpy).toHaveBeenCalledWith('inq-1', 'ws-1');
      expect(result).toEqual({ success: true, id: 'inq-1' });
      expect(vi.mocked(logAuditEvent).mock.calls[0][0]).toEqual(
        expect.objectContaining({ action: 'inquiry.deleted' }),
      );
    });
  });
});
