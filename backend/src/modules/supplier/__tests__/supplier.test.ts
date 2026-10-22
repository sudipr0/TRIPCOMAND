import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppError } from '../../../lib/errors.js';
import { logAuditEvent } from '../../../lib/audit.js';
import { SupplierService } from '../supplier.service.js';
import { SupplierRepository } from '../supplier.repository.js';

vi.mock('../../../lib/audit.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

function buildSupplier(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sup-1',
    workspaceId: 'ws-1',
    name: 'Namche Hilltop Lodge',
    code: 'NHL-01',
    category: 'ACCOMMODATION' as const,
    region: 'Khumbu',
    contactName: 'Pemba Sherpa',
    email: 'info@hilltoplodge.example',
    phone: '+977-9800000001',
    whatsapp: null,
    address: 'Namche Bazaar',
    taxId: null,
    paymentTerms: null,
    currency: 'NPR',
    status: 'ACTIVE' as const,
    rating: 4,
    notes: null,
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

function buildRate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'rate-1',
    workspaceId: 'ws-1',
    supplierId: 'sup-1',
    serviceType: 'room_night',
    description: 'Twin room, breakfast included',
    amount: 2000,
    currency: 'NPR',
    unit: 'per_room',
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: new Date('2026-12-31T23:59:59Z'),
    cancellationPolicy: '50% refund if cancelled 7+ days before',
    notes: null,
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

const supplierInput = {
  name: 'Namche Hilltop Lodge',
  category: 'ACCOMMODATION' as const,
  region: 'Khumbu',
  contactName: 'Pemba Sherpa',
  phone: '+977-9800000001',
  email: 'info@hilltoplodge.example',
  currency: 'NPR',
};

const rateInput = {
  serviceType: 'room_night',
  description: 'Twin room',
  amount: 2000,
  unit: 'per_room',
  validFrom: '2026-01-01T00:00:00.000Z',
  validTo: '2026-12-31T23:59:59.000Z',
  currency: 'NPR',
};

describe('SupplierService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logAuditEvent).mockClear();
  });

  describe('listSuppliers', () => {
    it('scopes list to workspaceId', async () => {
      const listSpy = vi.spyOn(SupplierRepository, 'listSuppliers').mockResolvedValue({
        total: 1,
        items: [buildSupplier()],
      });

      const result = await SupplierService.listSuppliers('ws-1', {
        limit: 50,
        offset: 0,
      });

      expect(listSpy).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({ limit: 50 }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0].name).toBe('Namche Hilltop Lodge');
    });
  });

  describe('createSupplier', () => {
    it('creates supplier and writes audit "supplier.created"', async () => {
      vi.spyOn(SupplierRepository, 'findByName').mockResolvedValue(null);
      const createSpy = vi
        .spyOn(SupplierRepository, 'create')
        .mockResolvedValue(buildSupplier() as never);

      const result = await SupplierService.createSupplier(
        'ws-1',
        'u-1',
        supplierInput,
      );

      expect(createSpy).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({ name: supplierInput.name }),
      );
      expect(result.id).toBe('sup-1');
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'supplier.created',
          entityType: 'supplier',
          entityId: 'sup-1',
        }),
      );
    });

    it('rejects duplicate name in workspace with conflict', async () => {
      vi.spyOn(SupplierRepository, 'findByName').mockResolvedValue(
        buildSupplier() as never,
      );
      const createSpy = vi.spyOn(SupplierRepository, 'create');

      await expect(
        SupplierService.createSupplier('ws-1', 'u-1', supplierInput),
      ).rejects.toThrow(AppError);

      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe('updateSupplier', () => {
    it('throws notFound when supplier not in workspace', async () => {
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(null);

      await expect(
        SupplierService.updateSupplier('ws-1', 'u-1', 'sup-missing', {
          contactName: 'New Contact',
        }),
      ).rejects.toThrow(AppError);
    });

    it('updates supplier and writes audit "supplier.updated"', async () => {
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(
        buildSupplier() as never,
      );
      const updateSpy = vi
        .spyOn(SupplierRepository, 'update')
        .mockResolvedValue(buildSupplier({ contactName: 'New Contact' }) as never);

      const result = await SupplierService.updateSupplier('ws-1', 'u-1', 'sup-1', {
        contactName: 'New Contact',
      });

      expect(updateSpy).toHaveBeenCalledWith('sup-1', 'ws-1', {
        contactName: 'New Contact',
      });
      expect(result.contactName).toBe('New Contact');
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'supplier.updated' }),
      );
    });
  });

  describe('deleteSupplier', () => {
    it('soft-deletes supplier and writes audit "supplier.deleted"', async () => {
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(
        buildSupplier() as never,
      );
      const deleteSpy = vi
        .spyOn(SupplierRepository, 'softDelete')
        .mockResolvedValue(buildSupplier({ deletedAt: new Date() }) as never);

      const result = await SupplierService.deleteSupplier('ws-1', 'u-1', 'sup-1');

      expect(deleteSpy).toHaveBeenCalledWith('sup-1', 'ws-1');
      expect(result).toEqual({ success: true, id: 'sup-1' });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'supplier.deleted' }),
      );
    });
  });

  describe('rates CRUD', () => {
    it('creates rate scoped to workspace and writes audit', async () => {
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(
        buildSupplier() as never,
      );
      const createRateSpy = vi
        .spyOn(SupplierRepository, 'createRate')
        .mockResolvedValue(buildRate() as never);

      const result = await SupplierService.createRate(
        'ws-1',
        'u-1',
        'sup-1',
        rateInput,
      );

      expect(createRateSpy).toHaveBeenCalledWith(
        'ws-1',
        'sup-1',
        expect.objectContaining({ serviceType: 'room_night' }),
      );
      expect(result.id).toBe('rate-1');
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'supplier.rate.created' }),
      );
    });

    it('rejects rate creation against foreign supplier with notFound', async () => {
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(null);

      await expect(
        SupplierService.createRate('ws-1', 'u-1', 'sup-foreign', rateInput),
      ).rejects.toThrow(AppError);
    });

    it('filters rates by active status', async () => {
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(
        buildSupplier() as never,
      );
      const findRatesSpy = vi
        .spyOn(SupplierRepository, 'findRates')
        .mockResolvedValue([buildRate()] as never);

      const result = await SupplierService.listRates('ws-1', 'sup-1', {
        active: true,
        limit: 50,
        offset: 0,
      });

      expect(findRatesSpy).toHaveBeenCalledWith('ws-1', 'sup-1', true);
      expect(result.items).toHaveLength(1);
    });

    it('deletes rate and writes audit "supplier.rate.deleted"', async () => {
      vi.spyOn(SupplierRepository, 'findRateById').mockResolvedValue(
        buildRate() as never,
      );
      const deleteRateSpy = vi
        .spyOn(SupplierRepository, 'deleteRate')
        .mockResolvedValue(buildRate() as never);

      const result = await SupplierService.deleteRate(
        'ws-1',
        'u-1',
        'sup-1',
        'rate-1',
      );

      expect(deleteRateSpy).toHaveBeenCalledWith('rate-1', 'ws-1');
      expect(result).toEqual({ success: true, id: 'rate-1' });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'supplier.rate.deleted' }),
      );
    });
  });

  describe('findAlternatives', () => {
    it('filters by category and active status, excludes self', async () => {
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(
        buildSupplier({ id: 'sup-1', category: 'ACCOMMODATION', region: 'Khumbu' }) as never,
      );
      const findAltsSpy = vi
        .spyOn(SupplierRepository, 'findAlternatives')
        .mockResolvedValue([
          {
            ...buildSupplier({ id: 'sup-2', name: 'Everest View Lodge', rating: 5 }),
            rates: [buildRate({ amount: 3000 })],
          },
        ] as never);

      const alternatives = await SupplierService.findAlternatives('ws-1', 'sup-1', {
        limit: 5,
      });

      expect(findAltsSpy).toHaveBeenCalledWith('ws-1', {
        category: 'ACCOMMODATION',
        region: 'Khumbu',
        excludeId: 'sup-1',
        limit: 5,
      });
      expect(alternatives).toHaveLength(1);
      expect(alternatives[0].id).toBe('sup-2');
      expect(alternatives[0].averageRate).toBe('3000.00');
    });

    it('sorts alternatives by rating desc', async () => {
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(
        buildSupplier({ id: 'sup-1', category: 'ACCOMMODATION', region: 'Khumbu' }) as never,
      );
      vi.spyOn(SupplierRepository, 'findAlternatives').mockResolvedValue([
        {
          ...buildSupplier({ id: 'sup-2', name: 'High Rating Lodge', rating: 5 }),
          rates: [],
        },
        {
          ...buildSupplier({ id: 'sup-3', name: 'Medium Rating Lodge', rating: 3 }),
          rates: [],
        },
      ] as never);

      const alternatives = await SupplierService.findAlternatives('ws-1', 'sup-1', {
        limit: 5,
      });

      expect(alternatives[0].rating).toBe(5);
      expect(alternatives[1].rating).toBe(3);
    });
  });

  describe('tenant isolation', () => {
    it('cannot access another workspace supplier', async () => {
      vi.spyOn(SupplierRepository, 'findById').mockResolvedValue(null);

      await expect(
        SupplierService.getSupplier('ws-1', 'sup-foreign'),
      ).rejects.toThrow(AppError);
    });
  });
});
