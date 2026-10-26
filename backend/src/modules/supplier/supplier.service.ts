import type { Prisma } from "@prisma/client";
import { SupplierRepository } from "./supplier.repository.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  ListSuppliersQuery,
  CreateSupplierRateInput,
  UpdateSupplierRateInput,
  ListSupplierRatesQuery,
  SupplierDetail,
  SupplierRateDetail,
  SupplierAlternative,
  ListSuppliersResult,
  ListSupplierRatesResult,
} from "@trailcomand/shared";

function toSupplierDetail(
  s: Prisma.SupplierGetPayload<object>,
): SupplierDetail {
  return {
    id: s.id,
    workspaceId: s.workspaceId,
    name: s.name,
    code: s.code,
    category: s.category,
    region: s.region,
    contactName: s.contactName,
    email: s.email,
    phone: s.phone,
    whatsapp: s.whatsapp,
    address: s.address,
    taxId: s.taxId,
    paymentTerms: s.paymentTerms,
    currency: s.currency,
    status: s.status,
    rating: s.rating,
    notes: s.notes,
    metadata: s.metadata,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    deletedAt: s.deletedAt ? s.deletedAt.toISOString() : null,
  };
}

function toSupplierRateDetail(
  r: Prisma.SupplierRateGetPayload<object>,
): SupplierRateDetail {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    supplierId: r.supplierId,
    serviceType: r.serviceType,
    description: r.description,
    amount: r.amount.toString(),
    currency: r.currency,
    unit: r.unit,
    validFrom: r.validFrom.toISOString(),
    validTo: r.validTo ? r.validTo.toISOString() : null,
    cancellationPolicy: r.cancellationPolicy,
    notes: r.notes,
    metadata: r.metadata,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export class SupplierService {
  static async listSuppliers(
    workspaceId: string,
    filter: ListSuppliersQuery,
  ): Promise<ListSuppliersResult> {
    const { total, items } = await SupplierRepository.listSuppliers(
      workspaceId,
      filter,
    );
    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map(toSupplierDetail),
    };
  }

  static async getSupplier(
    workspaceId: string,
    supplierId: string,
  ): Promise<SupplierDetail> {
    const supplier = await SupplierRepository.findById(supplierId, workspaceId);
    if (!supplier) {
      throw AppError.notFound("Supplier not found");
    }
    return toSupplierDetail(supplier);
  }

  static async createSupplier(
    workspaceId: string,
    userId: string,
    input: CreateSupplierInput,
  ): Promise<SupplierDetail> {
    const existing = await SupplierRepository.findByName(
      input.name,
      workspaceId,
    );
    if (existing) {
      throw AppError.conflict(
        `A supplier with name "${input.name}" already exists in this workspace`,
      );
    }

    const created = await SupplierRepository.create(workspaceId, {
      name: input.name,
      code: input.code ?? null,
      category: input.category,
      region: input.region ?? null,
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      address: input.address ?? null,
      taxId: input.taxId ?? null,
      paymentTerms: input.paymentTerms ?? null,
      currency: input.currency ?? "NPR",
      rating: input.rating ?? null,
      notes: input.notes ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier.created",
      entityType: "supplier",
      entityId: created.id,
      details: {
        name: created.name,
        category: created.category,
      },
    });

    return toSupplierDetail(created);
  }

  static async updateSupplier(
    workspaceId: string,
    userId: string,
    supplierId: string,
    input: UpdateSupplierInput,
  ): Promise<SupplierDetail> {
    const existing = await SupplierRepository.findById(supplierId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Supplier not found");
    }

    if (input.name && input.name !== existing.name) {
      const duplicate = await SupplierRepository.findByName(
        input.name,
        workspaceId,
      );
      if (duplicate && duplicate.id !== supplierId) {
        throw AppError.conflict(
          `A supplier with name "${input.name}" already exists in this workspace`,
        );
      }
    }

    const updated = await SupplierRepository.update(supplierId, workspaceId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.region !== undefined ? { region: input.region } : {}),
      ...(input.contactName !== undefined
        ? { contactName: input.contactName }
        : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.taxId !== undefined ? { taxId: input.taxId } : {}),
      ...(input.paymentTerms !== undefined
        ? { paymentTerms: input.paymentTerms }
        : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.metadata !== undefined
        ? { metadata: input.metadata as Prisma.InputJsonValue }
        : {}),
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier.updated",
      entityType: "supplier",
      entityId: supplierId,
      details: {
        name: updated.name,
        changedFields: Object.keys(input),
      },
    });

    return toSupplierDetail(updated);
  }

  static async deleteSupplier(
    workspaceId: string,
    userId: string,
    supplierId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await SupplierRepository.findById(supplierId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Supplier not found");
    }

    await SupplierRepository.softDelete(supplierId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier.deleted",
      entityType: "supplier",
      entityId: supplierId,
      details: {
        name: existing.name,
      },
    });

    return { success: true, id: supplierId };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Rates
  // ───────────────────────────────────────────────────────────────────────────

  static async listRates(
    workspaceId: string,
    supplierId: string,
    filter: ListSupplierRatesQuery,
  ): Promise<ListSupplierRatesResult> {
    const supplier = await SupplierRepository.findById(supplierId, workspaceId);
    if (!supplier) {
      throw AppError.notFound("Supplier not found in this workspace");
    }

    const rates = await SupplierRepository.findRates(
      workspaceId,
      supplierId,
      filter.active,
    );

    return {
      total: rates.length,
      limit: filter.limit,
      offset: filter.offset,
      items: rates
        .slice(filter.offset, filter.offset + filter.limit)
        .map(toSupplierRateDetail),
    };
  }

  static async getRate(
    workspaceId: string,
    supplierId: string,
    rateId: string,
  ): Promise<SupplierRateDetail> {
    const rate = await SupplierRepository.findRateById(rateId, workspaceId);
    if (!rate || rate.supplierId !== supplierId) {
      throw AppError.notFound("Supplier rate not found");
    }
    return toSupplierRateDetail(rate);
  }

  static async createRate(
    workspaceId: string,
    userId: string,
    supplierId: string,
    input: CreateSupplierRateInput,
  ): Promise<SupplierRateDetail> {
    const supplier = await SupplierRepository.findById(supplierId, workspaceId);
    if (!supplier) {
      throw AppError.notFound("Supplier not found in this workspace");
    }

    const created = await SupplierRepository.createRate(
      workspaceId,
      supplierId,
      {
        serviceType: input.serviceType,
        description: input.description ?? null,
        amount: input.amount,
        currency: input.currency ?? "NPR",
        unit: input.unit,
        validFrom: new Date(input.validFrom),
        validTo: input.validTo ? new Date(input.validTo) : null,
        cancellationPolicy: input.cancellationPolicy ?? null,
        notes: input.notes ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier.rate.created",
      entityType: "supplier_rate",
      entityId: created.id,
      details: {
        supplierId,
        serviceType: created.serviceType,
        amount: created.amount.toString(),
      },
    });

    return toSupplierRateDetail(created);
  }

  static async updateRate(
    workspaceId: string,
    userId: string,
    supplierId: string,
    rateId: string,
    input: UpdateSupplierRateInput,
  ): Promise<SupplierRateDetail> {
    const existing = await SupplierRepository.findRateById(rateId, workspaceId);
    if (!existing || existing.supplierId !== supplierId) {
      throw AppError.notFound("Supplier rate not found");
    }

    const updated = await SupplierRepository.updateRate(rateId, workspaceId, {
      ...(input.serviceType !== undefined
        ? { serviceType: input.serviceType }
        : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.validFrom !== undefined
        ? { validFrom: new Date(input.validFrom) }
        : {}),
      ...(input.validTo !== undefined
        ? { validTo: input.validTo ? new Date(input.validTo) : null }
        : {}),
      ...(input.cancellationPolicy !== undefined
        ? { cancellationPolicy: input.cancellationPolicy }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.metadata !== undefined
        ? { metadata: input.metadata as Prisma.InputJsonValue }
        : {}),
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier.rate.updated",
      entityType: "supplier_rate",
      entityId: rateId,
      details: {
        supplierId,
        changedFields: Object.keys(input),
      },
    });

    return toSupplierRateDetail(updated);
  }

  static async deleteRate(
    workspaceId: string,
    userId: string,
    supplierId: string,
    rateId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await SupplierRepository.findRateById(rateId, workspaceId);
    if (!existing || existing.supplierId !== supplierId) {
      throw AppError.notFound("Supplier rate not found");
    }

    await SupplierRepository.deleteRate(rateId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "supplier.rate.deleted",
      entityType: "supplier_rate",
      entityId: rateId,
      details: {
        supplierId,
      },
    });

    return { success: true, id: rateId };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Alternatives & Bookings check
  // ───────────────────────────────────────────────────────────────────────────

  static async findAlternatives(
    workspaceId: string,
    supplierId: string,
    options: { region?: string; limit?: number },
  ): Promise<SupplierAlternative[]> {
    const source = await SupplierRepository.findById(supplierId, workspaceId);
    if (!source) {
      throw AppError.notFound("Supplier not found in this workspace");
    }

    const alternatives = await SupplierRepository.findAlternatives(
      workspaceId,
      {
        category: source.category,
        region: options.region ?? source.region,
        excludeId: supplierId,
        limit: options.limit ?? 5,
      },
    );

    return alternatives.map((alt) => {
      let averageRate: string | null = null;
      if (alt.rates && alt.rates.length > 0) {
        const sum = alt.rates.reduce((acc, r) => acc + Number(r.amount), 0);
        averageRate = (sum / alt.rates.length).toFixed(2);
      }
      return {
        id: alt.id,
        name: alt.name,
        category: alt.category,
        region: alt.region,
        status: alt.status,
        rating: alt.rating,
        averageRate,
      };
    });
  }

  static async checkSupplierBookings(
    workspaceId: string,
    supplierId: string,
  ): Promise<{ count: number }> {
    const supplier = await SupplierRepository.findById(supplierId, workspaceId);
    if (!supplier) {
      throw AppError.notFound("Supplier not found in this workspace");
    }
    const count = await SupplierRepository.countActiveBookings(
      workspaceId,
      supplierId,
    );
    return { count };
  }
}
