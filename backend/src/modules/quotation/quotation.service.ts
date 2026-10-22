import type { Prisma } from "@prisma/client";
import { Prisma as PrismaNs } from "@prisma/client";
import type { CreateQuotationInput } from '@tripchange/shared';
import type { UpdateQuotationInput } from '@tripchange/shared';
import type { ListQuotationsResult } from '@tripchange/shared';
import type { ListQuotationsQuery, QuotationDetail } from '@tripchange/shared';

import { AppError } from "../../lib/errors.js";
import { rawPrisma } from "../../lib/prisma.js";
import { logAuditEvent } from "../../lib/audit.js";
import { BookingService } from "../booking/booking.service.js";
import { QuotationRepository } from "./quotation.repository.js";
import { InquiryRepository } from "../inquiry/inquiry.repository.js";
import { CustomerRepository } from "../customer/customer.repository.js";

function toLineItemDetail(item: {
  id: string;
  quotationId: string;
  category: string;
  description: string;
  quantity: Prisma.Decimal;
  unit: string;
  unitPrice: Prisma.Decimal;
  total: Prisma.Decimal;
  isOptional: boolean;
  createdAt: Date;
  updatedAt: Date;
}): import("@tripchange/shared").QuotationLineItemDetail {
  return {
    id: item.id,
    quotationId: item.quotationId,
    category: item.category,
    description: item.description,
    quantity: item.quantity.toString(),
    unit: item.unit,
    unitPrice: item.unitPrice.toString(),
    total: item.total.toString(),
    isOptional: item.isOptional,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function toVersionDetail(v: {
  id: string;
  quotationId: string;
  version: number;
  snapshot: Prisma.JsonValue;
  changedById: string | null;
  changeReason: string | null;
  createdAt: Date;
}): import("@tripchange/shared").QuotationVersionDetail {
  return {
    id: v.id,
    quotationId: v.quotationId,
    version: v.version,
    snapshot: v.snapshot,
    changedById: v.changedById,
    changeReason: v.changeReason,
    createdAt: v.createdAt.toISOString(),
  };
}

function toQuotationDetail(
  quotation: Prisma.QuotationGetPayload<{
    include: {
      lineItems: true;
      versions: true;
      customer: {
        select: { id: true; fullName: true; email: true; phone: true };
      };
    };
  }>,
): QuotationDetail {
  return {
    id: quotation.id,
    workspaceId: quotation.workspaceId,
    inquiryId: quotation.inquiryId,
    customerId: quotation.customerId,
    quotationNumber: quotation.quotationNumber,
    version: quotation.version,
    trekName: quotation.trekName,
    startDate: quotation.startDate.toISOString(),
    endDate: quotation.endDate.toISOString(),
    groupSize: quotation.groupSize,
    subtotal: quotation.subtotal.toString(),
    discount: quotation.discount.toString(),
    tax: quotation.tax.toString(),
    total: quotation.total.toString(),
    currency: quotation.currency,
    inclusions: quotation.inclusions,
    exclusions: quotation.exclusions,
    terms: quotation.terms,
    notes: quotation.notes,
    status: quotation.status,
    validUntil: quotation.validUntil ? quotation.validUntil.toISOString() : null,
    sentAt: quotation.sentAt ? quotation.sentAt.toISOString() : null,
    acceptedAt: quotation.acceptedAt ? quotation.acceptedAt.toISOString() : null,
    rejectedAt: quotation.rejectedAt ? quotation.rejectedAt.toISOString() : null,
    rejectionReason: quotation.rejectionReason,
    convertedToBookingId: quotation.convertedToBookingId,
    customer: quotation.customer
      ? {
          id: quotation.customer.id,
          fullName: quotation.customer.fullName,
          email: quotation.customer.email,
          phone: quotation.customer.phone,
        }
      : undefined,
    lineItems: quotation.lineItems?.map(toLineItemDetail),
    versions: quotation.versions?.map(toVersionDetail),
    metadata: quotation.metadata,
    createdAt: quotation.createdAt.toISOString(),
    updatedAt: quotation.updatedAt.toISOString(),
    deletedAt: quotation.deletedAt ? quotation.deletedAt.toISOString() : null,
  };
}

function computeTotals(
  lineItems: { quantity: number; unitPrice: number }[],
  discount: number,
  tax: number,
) {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const total = subtotal - discount + tax;
  return { subtotal, total };
}

export class QuotationService {
  static async listQuotations(
    workspaceId: string,
    filter: ListQuotationsQuery,
  ): Promise<ListQuotationsResult> {
    const { total, items } = await QuotationRepository.listQuotations(
      workspaceId,
      filter,
    );
    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map((item) =>
        toQuotationDetail(
          item as Prisma.QuotationGetPayload<{
            include: {
              lineItems: true;
              versions: true;
              customer: {
                select: { id: true; fullName: true; email: true; phone: true };
              };
            };
          }> & { lineItems: []; versions: []; customer: null },
        ),
      ),
    };
  }

  static async getQuotation(
    workspaceId: string,
    quotationId: string,
  ): Promise<QuotationDetail> {
    const quotation = await QuotationRepository.findById(
      quotationId,
      workspaceId,
    );
    if (!quotation) {
      throw AppError.notFound("Quotation not found");
    }
    return toQuotationDetail(quotation);
  }

  static async createQuotation(
    workspaceId: string,
    userId: string,
    input: CreateQuotationInput,
  ): Promise<QuotationDetail> {
    // Customer must exist in the same workspace (tenancy guard).
    const customer = await rawPrisma.customer.findFirst({
      where: { id: input.customerId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) {
      throw AppError.notFound("Customer not found in this workspace");
    }

    // Inquiry, if provided, must belong to the same workspace and customer.
    if (input.inquiryId) {
      const inquiry = await InquiryRepository.findById(
        input.inquiryId,
        workspaceId,
      );
      if (!inquiry || inquiry.customerId !== input.customerId) {
        throw AppError.notFound(
          "Inquiry not found in this workspace for this customer",
        );
      }
    }

    const { subtotal, total } = computeTotals(
      input.lineItems,
      input.discount ?? 0,
      input.tax ?? 0,
    );
    const quotationNumber = await QuotationRepository.generateNumber(
      workspaceId,
    );

    const created = await QuotationRepository.create(workspaceId, {
      inquiryId: input.inquiryId ?? null,
      customerId: input.customerId,
      quotationNumber,
      trekName: input.trekName,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      groupSize: input.groupSize,
      subtotal,
      discount: input.discount ?? 0,
      tax: input.tax ?? 0,
      total,
      currency: input.currency ?? "NPR",
      inclusions: input.inclusions ?? [],
      exclusions: input.exclusions ?? [],
      terms: input.terms ?? null,
      notes: input.notes ?? null,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      lineItems: input.lineItems.map((item) => ({
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
        isOptional: item.isOptional,
      })),
    });

    // Save the initial version snapshot (v1).
    await QuotationRepository.createVersionSnapshot(
      created.id,
      1,
      toQuotationDetail(created),
      userId,
      "Initial creation",
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "quotation.created",
      entityType: "quotation",
      entityId: created.id,
      details: { quotationNumber, total: created.total.toString() },
    });

    return toQuotationDetail(created);
  }

  static async updateQuotation(
    workspaceId: string,
    quotationId: string,
    userId: string,
    input: UpdateQuotationInput,
  ): Promise<QuotationDetail> {
    const existing = await QuotationRepository.findById(
      quotationId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Quotation not found");
    }

    // Snapshot the prior version before applying changes.
    await QuotationRepository.createVersionSnapshot(
      quotationId,
      existing.version,
      toQuotationDetail(existing),
      userId,
      "Snapshot prior to update",
    );

    const lineItems =
      input.lineItems ??
      existing.lineItems.map((item) => ({
        category: item.category,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        isOptional: item.isOptional,
      }));
    const { subtotal, total } = computeTotals(
      lineItems,
      input.discount !== undefined ? input.discount : Number(existing.discount),
      input.tax !== undefined ? input.tax : Number(existing.tax),
    );

    const updated = await QuotationRepository.update(quotationId, workspaceId, {
      ...input,
      version: existing.version + 1,
    } as UpdateQuotationInput & { version: number; subtotal: number; total: number });

    // Persist recomputed totals (repository update ignores unknown keys).
    if (updated.subtotal.toString() !== String(subtotal) || updated.total.toString() !== String(total)) {
      await QuotationRepository.updateStatus(quotationId, workspaceId, updated.status, {
        subtotal,
        total,
      });
    }

    await logAuditEvent({
      workspaceId,
      userId,
      action: "quotation.updated",
      entityType: "quotation",
      entityId: quotationId,
      details: {
        quotationNumber: existing.quotationNumber,
        newVersion: updated.version,
        changedFields: Object.keys(input),
      },
    });

    return toQuotationDetail(updated);
  }

  static async sendQuotation(
    workspaceId: string,
    quotationId: string,
    userId: string,
  ): Promise<QuotationDetail> {
    const existing = await QuotationRepository.findById(
      quotationId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Quotation not found");
    }
    if (existing.status !== "DRAFT") {
      throw AppError.conflict(
        `Quotation in status ${existing.status} cannot be sent`,
      );
    }

    const updated = await QuotationRepository.updateStatus(
      quotationId,
      workspaceId,
      "SENT",
      { sentAt: new Date() },
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "quotation.sent",
      entityType: "quotation",
      entityId: quotationId,
      details: { quotationNumber: existing.quotationNumber },
    });

    return toQuotationDetail(updated);
  }

  static async acceptQuotation(
    workspaceId: string,
    quotationId: string,
    userId: string,
  ): Promise<QuotationDetail> {
    const existing = await QuotationRepository.findById(
      quotationId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Quotation not found");
    }
    if (existing.status !== "SENT" && existing.status !== "VIEWED") {
      throw AppError.conflict(
        `Quotation in status ${existing.status} cannot be accepted`,
      );
    }

    const updated = await QuotationRepository.updateStatus(
      quotationId,
      workspaceId,
      "ACCEPTED",
      { acceptedAt: new Date() },
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "quotation.accepted",
      entityType: "quotation",
      entityId: quotationId,
      details: { quotationNumber: existing.quotationNumber },
    });

    return toQuotationDetail(updated);
  }

  static async rejectQuotation(
    workspaceId: string,
    quotationId: string,
    userId: string,
    reason: string,
  ): Promise<QuotationDetail> {
    const existing = await QuotationRepository.findById(
      quotationId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Quotation not found");
    }
    if (existing.status !== "SENT" && existing.status !== "VIEWED") {
      throw AppError.conflict(
        `Quotation in status ${existing.status} cannot be rejected`,
      );
    }

    const updated = await QuotationRepository.updateStatus(
      quotationId,
      workspaceId,
      "REJECTED",
      { rejectedAt: new Date(), rejectionReason: reason },
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "quotation.rejected",
      entityType: "quotation",
      entityId: quotationId,
      details: { quotationNumber: existing.quotationNumber, reason },
    });

    return toQuotationDetail(updated);
  }

  static async deleteQuotation(
    workspaceId: string,
    quotationId: string,
    userId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await QuotationRepository.findById(
      quotationId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Quotation not found");
    }

    await QuotationRepository.softDelete(quotationId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "quotation.deleted",
      entityType: "quotation",
      entityId: quotationId,
      details: { quotationNumber: existing.quotationNumber },
    });

    return { success: true, id: quotationId };
  }

  static async convertToBooking(
    workspaceId: string,
    quotationId: string,
    userId: string,
  ): Promise<{ quotation: QuotationDetail; booking: unknown; trip: unknown }> {
    const existing = await QuotationRepository.findById(
      quotationId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Quotation not found");
    }
    if (existing.status !== "ACCEPTED") {
      throw AppError.forbidden(
        "Only ACCEPTED quotations can be converted to a booking",
      );
    }
    if (existing.convertedToBookingId) {
      throw AppError.conflict(
        "Quotation has already been converted to a booking",
      );
    }

    const { booking, trip } = await BookingService.createFromQuotation(
      workspaceId,
      userId,
      quotationId,
    );

    await QuotationRepository.updateStatus(
      quotationId,
      workspaceId,
      existing.status,
      { convertedToBookingId: booking.id },
    );

    // Mark the linked inquiry (if any) as WON.
    if (existing.inquiryId) {
      await InquiryRepository.update(existing.inquiryId, workspaceId, {
        status: "WON",
        lastContactedAt: new Date(),
      });
    }

    await logAuditEvent({
      workspaceId,
      userId,
      action: "quotation.converted",
      entityType: "quotation",
      entityId: quotationId,
      details: {
        quotationNumber: existing.quotationNumber,
        bookingId: booking.id,
      },
    });

    const refreshed = await QuotationRepository.findById(
      quotationId,
      workspaceId,
    );
    return {
      quotation: refreshed ? toQuotationDetail(refreshed) : toQuotationDetail(existing),
      booking: booking as unknown,
      trip: trip as unknown,
    };
  }
}
