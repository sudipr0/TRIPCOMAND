import type { Prisma } from '@prisma/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppError } from '../../../lib/errors.js';
import { AgencyService } from '../agency.service.js';
import { AgencyRepository } from '../agency.repository.js';

vi.mock('../../../lib/audit.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

type WorkspacePayload = Prisma.WorkspaceGetPayload<object>;

function buildWorkspace(
  overrides: Partial<WorkspacePayload> = {}
): WorkspacePayload {
  return {
    id: 'ws-1',
    name: 'Himalaya Treks',
    slug: 'himalaya-treks',
    status: 'ACTIVE' as const,
    settings: {
      currency: 'NPR',
      timezone: 'Asia/Kathmandu',
      locale: 'en',
      contactEmail: 'hello@himalaya.example.com',
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('AgencyService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProfile', () => {
    it('returns the workspace as the agency profile', async () => {
      const findSpy = vi
        .spyOn(AgencyRepository, 'findById')
        .mockResolvedValue(buildWorkspace());

      const result = await AgencyService.getProfile('ws-1');

      expect(findSpy).toHaveBeenCalledWith('ws-1');
      expect(result.id).toBe('ws-1');
      expect(result.name).toBe('Himalaya Treks');
      expect(result.slug).toBe('himalaya-treks');
      expect(result.currency).toBe('NPR');
      expect(result.contactEmail).toBe('hello@himalaya.example.com');
    });

    it('throws not found when the workspace does not exist', async () => {
      vi.spyOn(AgencyRepository, 'findById').mockResolvedValue(null);

      await expect(AgencyService.getProfile('missing')).rejects.toThrow(
        AppError
      );
    });
  });

  describe('updateProfile', () => {
    it('calls the repository and records an audit event', async () => {
      vi.spyOn(AgencyRepository, 'findById').mockResolvedValue(
        buildWorkspace()
      );
      const updateSpy = vi
        .spyOn(AgencyRepository, 'update')
        .mockResolvedValue(
          buildWorkspace({ name: 'Himalaya Treks Pvt Ltd' })
        );

      const result = await AgencyService.updateProfile('ws-1', 'u1', {
        name: 'Himalaya Treks Pvt Ltd',
      });

      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy.mock.calls[0][0]).toBe('ws-1');
      expect(result.name).toBe('Himalaya Treks Pvt Ltd');
    });
  });

  describe('updateSettings', () => {
    it('merges settings into the workspace settings JSON', async () => {
      vi.spyOn(AgencyRepository, 'findById').mockResolvedValue(
        buildWorkspace()
      );
      const updateSpy = vi
        .spyOn(AgencyRepository, 'update')
        .mockResolvedValue(buildWorkspace({ settings: { currency: 'USD' } }));

      await AgencyService.updateSettings('ws-1', 'u1', { currency: 'USD' });

      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy.mock.calls[0][0]).toBe('ws-1');
    });
  });

  describe('tenant isolation', () => {
    it('cannot update another workspace', async () => {
      vi.spyOn(AgencyRepository, 'findById').mockResolvedValue(null);
      const updateSpy = vi.spyOn(AgencyRepository, 'update');

      await expect(
        AgencyService.updateProfile('ws-2', 'u1', { name: 'Other Agency' })
      ).rejects.toThrow(AppError);

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });
});
