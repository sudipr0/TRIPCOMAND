import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StaffService } from '../staff.service.js';
import { StaffRepository } from '../staff.repository.js';
import { AppError } from '../../../lib/errors.js';

vi.mock('../../../lib/audit.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildStaff(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'staff-1',
    workspaceId: 'ws-1',
    userId: null,
    staffType: 'GUIDE' as const,
    fullName: 'Pemba Sherpa',
    email: 'pemba@example.com',
    phone: '+977-9800000000',
    whatsapp: null,
    photoUrl: null,
    licenseNumber: null,
    licenseExpiry: null,
    languages: ['English', 'Nepali'],
    certifications: [],
    experienceYears: 8,
    experienceLevel: 'senior',
    preferredRoutes: [],
    emergencyContactName: null,
    emergencyContactPhone: null,
    status: 'AVAILABLE' as const,
    notes: null,
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    documents: [],
    ...overrides,
  };
}

describe('StaffService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('listStaff', () => {
    it('scopes the repository query to the supplied workspaceId', async () => {
      const listSpy = vi
        .spyOn(StaffRepository, 'listStaff')
        .mockResolvedValue({ total: 1, items: [buildStaff()] });

      const result = await StaffService.listStaff('ws-1', {
        limit: 50,
        offset: 0,
      });

      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({ limit: 50, offset: 0 })
      );
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe('staff-1');
      expect(result.items[0].workspaceId).toBe('ws-1');
    });
  });

  describe('getStaff', () => {
    it('throws not found when staff profile does not exist in workspace', async () => {
      vi.spyOn(StaffRepository, 'findById').mockResolvedValue(null);

      await expect(StaffService.getStaff('ws-1', 'missing')).rejects.toThrow(
        AppError
      );
    });

    it('returns the profile when found in workspace', async () => {
      vi.spyOn(StaffRepository, 'findById').mockResolvedValue(buildStaff());

      const result = await StaffService.getStaff('ws-1', 'staff-1');
      expect(result.id).toBe('staff-1');
      expect(result.fullName).toBe('Pemba Sherpa');
    });
  });

  describe('createStaff', () => {
    it('throws conflict when a profile with the same email exists in workspace', async () => {
      vi.spyOn(StaffRepository, 'findByEmail').mockResolvedValue(buildStaff());

      await expect(
        StaffService.createStaff('ws-1', 'u1', {
          staffType: 'GUIDE',
          fullName: 'Duplicate Email',
          email: 'pemba@example.com',
        })
      ).rejects.toThrow(AppError);
    });

    it('creates a staff profile scoped to the workspace', async () => {
      vi.spyOn(StaffRepository, 'findByEmail').mockResolvedValue(null);
      const createSpy = vi
        .spyOn(StaffRepository, 'create')
        .mockResolvedValue(buildStaff());
      vi.spyOn(StaffRepository, 'findById').mockResolvedValue(buildStaff());

      const result = await StaffService.createStaff('ws-1', 'u1', {
        staffType: 'GUIDE',
        fullName: 'Pemba Sherpa',
      });

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy.mock.calls[0][0]).toBe('ws-1');
      expect(result.id).toBe('staff-1');
    });
  });

  describe('updateStaff', () => {
    it('throws not found when profile is not in the workspace', async () => {
      vi.spyOn(StaffRepository, 'findById').mockResolvedValue(null);

      await expect(
        StaffService.updateStaff('ws-1', 'missing', 'u1', { fullName: 'X' })
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteStaff', () => {
    it('throws not found when profile is not in the workspace', async () => {
      vi.spyOn(StaffRepository, 'findById').mockResolvedValue(null);

      await expect(
        StaffService.deleteStaff('ws-1', 'missing', 'u1')
      ).rejects.toThrow(AppError);
    });

    it('soft deletes a staff profile in the workspace', async () => {
      vi.spyOn(StaffRepository, 'findById').mockResolvedValue(buildStaff());
      const softDeleteSpy = vi
        .spyOn(StaffRepository, 'softDelete')
        .mockResolvedValue(buildStaff({ deletedAt: new Date() }));

      const result = await StaffService.deleteStaff('ws-1', 'staff-1', 'u1');

      expect(softDeleteSpy).toHaveBeenCalledWith('staff-1', 'ws-1');
      expect(result.success).toBe(true);
      expect(result.id).toBe('staff-1');
    });
  });

  describe('createDocument', () => {
    it('throws not found when staff profile is not in the workspace', async () => {
      vi.spyOn(StaffRepository, 'findById').mockResolvedValue(null);

      await expect(
        StaffService.createDocument('ws-1', 'missing', 'u1', {
          documentType: 'license',
          title: 'Guide License',
          fileUrl: 'https://files.example.com/license.pdf',
        })
      ).rejects.toThrow(AppError);
    });

    it('creates a document scoped to workspace and staff', async () => {
      vi.spyOn(StaffRepository, 'findById').mockResolvedValue(buildStaff());
      const docSpy = vi
        .spyOn(StaffRepository, 'createDocument')
        .mockResolvedValue({
          id: 'doc-1',
          workspaceId: 'ws-1',
          staffId: 'staff-1',
          documentType: 'license',
          title: 'Guide License',
          fileUrl: 'https://files.example.com/license.pdf',
          fileName: null,
          fileSize: null,
          mimeType: null,
          expiresAt: null,
          verified: false,
          verifiedById: null,
          verifiedAt: null,
          notes: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        });

      const result = await StaffService.createDocument('ws-1', 'staff-1', 'u1', {
        documentType: 'license',
        title: 'Guide License',
        fileUrl: 'https://files.example.com/license.pdf',
      });

      expect(docSpy.mock.calls[0][0]).toBe('ws-1');
      expect(docSpy.mock.calls[0][1]).toBe('staff-1');
      expect(result.id).toBe('doc-1');
    });
  });

  describe('verifyDocument', () => {
    it('throws not found when document is not in the workspace', async () => {
      vi.spyOn(StaffRepository, 'findDocumentById').mockResolvedValue(null);

      await expect(
        StaffService.verifyDocument('ws-1', 'missing-doc', 'u1', {
          verified: true,
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('tenant isolation', () => {
    it('does not return staff belonging to another workspace', async () => {
      // Simulate repository returning null because the id exists in ws-2, not ws-1.
      vi.spyOn(StaffRepository, 'findById').mockResolvedValue(null);

      await expect(StaffService.getStaff('ws-1', 'staff-in-ws-2')).rejects.toThrow(
        AppError
      );

      // The repository must always be called with the caller workspace id.
      expect(StaffRepository.findById).toHaveBeenCalledWith(
        'staff-in-ws-2',
        'ws-1'
      );
    });

    it('rejects cross-workspace delete attempts', async () => {
      vi.spyOn(StaffRepository, 'findById').mockResolvedValue(null);
      const softDeleteSpy = vi.spyOn(StaffRepository, 'softDelete');

      await expect(
        StaffService.deleteStaff('ws-1', 'staff-in-ws-2', 'u1')
      ).rejects.toThrow(AppError);

      expect(softDeleteSpy).not.toHaveBeenCalled();
    });

    it('rejects cross-workspace document creation', async () => {
      vi.spyOn(StaffRepository, 'findById').mockResolvedValue(null);
      const docSpy = vi.spyOn(StaffRepository, 'createDocument');

      await expect(
        StaffService.createDocument('ws-1', 'staff-in-ws-2', 'u1', {
          documentType: 'license',
          title: 'Guide License',
          fileUrl: 'https://files.example.com/license.pdf',
        })
      ).rejects.toThrow(AppError);

      expect(docSpy).not.toHaveBeenCalled();
    });
  });
});
