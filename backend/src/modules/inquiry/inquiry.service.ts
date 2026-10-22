import type { Prisma } from "@prisma/client";
import { Prisma as PrismaNs } from "@prisma/client";
import type { CreateInquiryInput } from '@tripchange/shared';
import type { UpdateInquiryInput } from '@tripchange/shared';
import type { ListInquiriesResult } from '@tripchange/shared';
import type { ListInquiriesQuery, InquiryDetail } from '@tripchange/shared';

import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import { InquiryRepository } from "./inquiry.repository.js";

function toInquiryDetail(inquiry: {
  id: string;
  workspaceId: string;
  customerId: string;
  inquiryNumber: string;
  trekInterest: string | null;
  destinationText: string | null;
  preferredStart: Date | null;
  preferredEnd: Date | null;
  flexibleDates: boolean;
  groupSize: number;
  adults: number;
  children: number;
  specialRequirements: string | null;
  budgetExpectation: Prisma.Decimal | null;
  budgetCurrency: string;
  status: string;
  priority: string;
  source: string | null;
  assignedToId: string | null;
  nextFollowUpAt: Date | null;
  lastContactedAt: Date | null;
  lostReason: string | null;
  notes: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  activities?: {
    id: string;
    workspaceId: string;
    inquiryId: string;
    userId: string | null;
    activityType: string;
    description: string;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }[];
}): InquiryDetail {
  return {
    id: inquiry.id,
    workspaceId: inquiry.workspaceId,
    customerId: inquiry.customerId,
    inquiryNumber: inquiry.inquiryNumber,
    trekInterest: inquiry.trekInterest,
    destinationText: inquiry.destinationText,
    preferredStart: inquiry.preferredStart
      ? inquiry.preferredStart.toISOString()
      : null,
    preferredEnd: inquiry.preferredEnd
      ? inquiry.preferredEnd.toISOString()
      : null,
    flexibleDates: inquiry.flexibleDates,
    groupSize: inquiry.groupSize,
    adults: inquiry.adults,
    children: inquiry.children,
    specialRequirements: inquiry.specialRequirements,
    budgetExpectation: inquiry.budgetExpectation
      ? inquiry.budgetExpectation.toString()
      : null,
    budgetCurrency: inquiry.budgetCurrency,
    status: inquiry.status,
    priority: inquiry.priority,
    source: inquiry.source,
    assignedToId: inquiry.assignedToId,
    nextFollowUpAt: inquiry.nextFollowUpAt
      ? inquiry.nextFollowUpAt.toISOString()
      : null,
    lastContactedAt: inquiry.lastContactedAt
      ? inquiry.lastContactedAt.toISOString()
      : null,
    lostReason: inquiry.lostReason,
    notes: inquiry.notes,
    metadata: inquiry.metadata,
    createdAt: inquiry.createdAt.toISOString(),
    updatedAt: inquiry.updatedAt.toISOString(),
    deletedAt: inquiry.deletedAt ? inquiry.deletedAt.toISOString() : null,
    activities: inquiry.activities
      ? inquiry.activities.map((a) => ({
          id: a.id,
          workspaceId: a.workspaceId,
          inquiryId: a.inquiryId,
          userId: a.userId,
          activityType: a.activityType,
          description: a.description,
          metadata: a.metadata,
          createdAt: a.createdAt.toISOString(),
        }))
      : undefined,
  };
}

/**
 * Generate the next inquiry number for a workspace.
 * Format: INQ-YYYY-NNN (zero-padded, per-workspace sequence).
 */
async function generateInquiryNumber(
  workspaceId: string,
  year: number,
): Promise<string> {
  const count = await InquiryRepository.countByYear(workspaceId, year);
  // Retry-safe: unique constraint on (workspaceId, inquiryNumber) catches races.
  return `INQ-${year}-${String(count + 1).padStart(3, "0")}`;
}

export class InquiryService {
  static async listInquiries(
    workspaceId: string,
    filter: ListInquiriesQuery,
  ): Promise<ListInquiriesResult> {
    const { total, items } = await InquiryRepository.listInquiries(
      workspaceId,
      filter,
    );
    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map(toInquiryDetail),
    };
  }

  static async getInquiry(
    workspaceId: string,
    inquiryId: string,
  ): Promise<InquiryDetail> {
    const inquiry = await InquiryRepository.findByIdWithActivities(
      inquiryId,
      workspaceId,
    );
    if (!inquiry) {
      throw AppError.notFound("Inquiry not found");
    }
    return toInquiryDetail(inquiry);
  }

  static async createInquiry(
    workspaceId: string,
    userId: string,
    input: CreateInquiryInput,
  ): Promise<InquiryDetail> {
    // Customer must exist in the same workspace (tenancy guard).
    const customer = await rawPrismaCustomerExists(workspaceId, input.customerId);
    if (!customer) {
      throw AppError.badRequest(
        "Customer not found in this workspace",
      );
    }

    if (input.preferredStart && input.preferredEnd) {
      const start = new Date(input.preferredStart);
      const end = new Date(input.preferredEnd);
      if (end < start) {
        throw AppError.badRequest(
          "preferredEnd must be on or after preferredStart",
        );
      }
    }

    const year = new Date().getFullYear();
    let created;
    // Retry on unique-constraint collision (concurrent creation).
    for (let attempt = 0; attempt < 3; attempt++) {
      const inquiryNumber = await generateInquiryNumber(workspaceId, year);
      try {
        created = await InquiryRepository.create(workspaceId, {
          customerId: input.customerId,
          inquiryNumber,
          trekInterest: input.trekInterest ?? null,
          destinationText: input.destinationText ?? null,
          preferredStart: input.preferredStart
            ? new Date(input.preferredStart)
            : null,
          preferredEnd: input.preferredEnd ? new Date(input.preferredEnd) : null,
          flexibleDates: input.flexibleDates ?? true,
          groupSize: input.groupSize ?? 1,
          adults: input.adults ?? 1,
          children: input.children ?? 0,
          specialRequirements: input.specialRequirements ?? null,
          budgetExpectation:
            input.budgetExpectation !== undefined &&
            input.budgetExpectation !== null
              ? new PrismaNs.Decimal(input.budgetExpectation)
              : null,
          budgetCurrency: input.budgetCurrency ?? "NPR",
          priority: input.priority ?? "MEDIUM",
          source: input.source ?? null,
          nextFollowUpAt: input.nextFollowUpAt
            ? new Date(input.nextFollowUpAt)
            : null,
          notes: input.notes ?? null,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        });
        break;
      } catch (err) {
        if (
          err instanceof PrismaNs.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          attempt < 2
        ) {
          continue; // sequence race — retry with a fresh count
        }
        throw err;
      }
    }
    if (!created) {
      throw AppError.internal("Failed to create inquiry after retries");
    }

    // Seed the activity timeline with the creation event.
    await InquiryRepository.createActivity(workspaceId, {
      inquiryId: created.id,
      userId,
      activityType: "inquiry.created",
      description: `Inquiry ${created.inquiryNumber} created`,
      metadata: { inquiryNumber: created.inquiryNumber },
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "inquiry.created",
      entityType: "inquiry",
      entityId: created.id,
      details: {
        inquiryNumber: created.inquiryNumber,
        customerId: created.customerId,
      },
    });

    return toInquiryDetail(created);
  }

  static async updateInquiry(
    workspaceId: string,
    inquiryId: string,
    userId: string,
    input: UpdateInquiryInput,
  ): Promise<InquiryDetail> {
    const existing = await InquiryRepository.findById(inquiryId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Inquiry not found");
    }

    if (
      input.preferredStart &&
      input.preferredEnd &&
      new Date(input.preferredEnd) < new Date(input.preferredStart)
    ) {
      throw AppError.badRequest(
        "preferredEnd must be on or after preferredStart",
      );
    }

    const updateData: Prisma.InquiryUpdateInput = {};
    if (input.trekInterest !== undefined)
      updateData.trekInterest = input.trekInterest;
    if (input.destinationText !== undefined)
      updateData.destinationText = input.destinationText;
    if (input.preferredStart !== undefined)
      updateData.preferredStart = input.preferredStart
        ? new Date(input.preferredStart)
        : null;
    if (input.preferredEnd !== undefined)
      updateData.preferredEnd = input.preferredEnd
        ? new Date(input.preferredEnd)
        : null;
    if (input.flexibleDates !== undefined)
      updateData.flexibleDates = input.flexibleDates;
    if (input.groupSize !== undefined) updateData.groupSize = input.groupSize;
    if (input.adults !== undefined) updateData.adults = input.adults;
    if (input.children !== undefined) updateData.children = input.children;
    if (input.specialRequirements !== undefined)
      updateData.specialRequirements = input.specialRequirements;
    if (input.budgetExpectation !== undefined)
      updateData.budgetExpectation =
        input.budgetExpectation !== null
          ? new PrismaNs.Decimal(input.budgetExpectation)
          : null;
    if (input.budgetCurrency !== undefined)
      updateData.budgetCurrency = input.budgetCurrency;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.source !== undefined) updateData.source = input.source;
    if (input.assignedToId !== undefined) {
      if (input.assignedToId) {
        const staffExists = await rawPrismaUserExists(
          workspaceId,
          input.assignedToId,
        );
        if (!staffExists) {
          throw AppError.badRequest(
            "Assigned user is not a member of this workspace",
          );
        }
        updateData.assignedTo = { connect: { id: input.assignedToId } };
      } else {
        updateData.assignedTo = { disconnect: true };
      }
    }
    if (input.nextFollowUpAt !== undefined)
      updateData.nextFollowUpAt = input.nextFollowUpAt
        ? new Date(input.nextFollowUpAt)
        : null;
    if (input.lastContactedAt !== undefined)
      updateData.lastContactedAt = input.lastContactedAt
        ? new Date(input.lastContactedAt)
        : null;
    if (input.lostReason !== undefined)
      updateData.lostReason = input.lostReason;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.metadata !== undefined)
      updateData.metadata = input.metadata as Prisma.InputJsonValue;

    const updated = await InquiryRepository.update(
      inquiryId,
      workspaceId,
      updateData,
    );

    await InquiryRepository.createActivity(workspaceId, {
      inquiryId,
      userId,
      activityType: "inquiry.updated",
      description: `Inquiry ${existing.inquiryNumber} updated`,
      metadata: { changedFields: Object.keys(updateData) },
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "inquiry.updated",
      entityType: "inquiry",
      entityId: inquiryId,
      details: { changedFields: Object.keys(updateData) },
    });

    return toInquiryDetail(updated);
  }

  static async deleteInquiry(
    workspaceId: string,
    inquiryId: string,
    userId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await InquiryRepository.findById(inquiryId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Inquiry not found");
    }

    await InquiryRepository.softDelete(inquiryId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "inquiry.deleted",
      entityType: "inquiry",
      entityId: inquiryId,
      details: { inquiryNumber: existing.inquiryNumber },
    });

    return { success: true, id: inquiryId };
  }

  static async logActivity(
    workspaceId: string,
    inquiryId: string,
    userId: string,
    input: { activityType: string; description: string; metadata?: unknown },
  ): Promise<InquiryDetail["activities"] extends undefined ? never : any> {
    const inquiry = await InquiryRepository.findById(inquiryId, workspaceId);
    if (!inquiry) {
      throw AppError.notFound("Inquiry not found");
    }

    const activity = await InquiryRepository.createActivity(workspaceId, {
      inquiryId,
      userId,
      activityType: input.activityType,
      description: input.description,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "inquiry.activity.logged",
      entityType: "inquiry",
      entityId: inquiryId,
      details: { activityType: input.activityType },
    });

    return {
      id: activity.id,
      workspaceId: activity.workspaceId,
      inquiryId: activity.inquiryId,
      userId: activity.userId,
      activityType: activity.activityType,
      description: activity.description,
      metadata: activity.metadata,
      createdAt: activity.createdAt.toISOString(),
    } as never;
  }

  static async convertInquiry(
    workspaceId: string,
    inquiryId: string,
    userId: string,
  ): Promise<{
    inquiryId: string;
    status: string;
    nextStep: string;
  }> {
    const existing = await InquiryRepository.findById(inquiryId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Inquiry not found");
    }

    if (existing.status === "WON" || existing.status === "LOST") {
      throw AppError.conflict(
        `Inquiry in status ${existing.status} cannot be converted`,
      );
    }
    if (existing.status === "QUOTED") {
      throw AppError.conflict(
        "Inquiry has already been converted to a quotation",
      );
    }

    // Mark the inquiry QUOTED and record the transition.
    // The actual quotation is created via POST /quotations (loose coupling).
    await InquiryRepository.update(inquiryId, workspaceId, {
      status: "QUOTED",
      lastContactedAt: new Date(),
    });

    await InquiryRepository.createActivity(workspaceId, {
      inquiryId,
      userId,
      activityType: "inquiry.converted",
      description: `Inquiry ${existing.inquiryNumber} converted to QUOTED`,
      metadata: {},
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "inquiry.converted_to_quotation",
      entityType: "inquiry",
      entityId: inquiryId,
      details: { inquiryNumber: existing.inquiryNumber },
    });

    return {
      inquiryId,
      status: "QUOTED",
      nextStep: "Create quotation via POST /quotations",
    };
  }

  static async listActivities(
    workspaceId: string,
    inquiryId: string,
  ): Promise<
    { id: string; activityType: string; description: string; createdAt: string }[]
  > {
    const inquiry = await InquiryRepository.findById(inquiryId, workspaceId);
    if (!inquiry) {
      throw AppError.notFound("Inquiry not found");
    }
    const activities = await InquiryRepository.listActivities(
      workspaceId,
      inquiryId,
    );
    return activities.map((a) => ({
      id: a.id,
      activityType: a.activityType,
      description: a.description,
      createdAt: a.createdAt.toISOString(),
    }));
  }
}

// Local tenancy guards (kept here to avoid coupling to other modules' repos).
async function rawPrismaCustomerExists(
  workspaceId: string,
  customerId: string,
): Promise<boolean> {
  const { rawPrisma } = await import("../../lib/prisma.js");
  const customer = await rawPrisma.customer.findFirst({
    where: { id: customerId, workspaceId, deletedAt: null },
    select: { id: true },
  });
  return customer !== null;
}

async function rawPrismaUserExists(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { rawPrisma } = await import("../../lib/prisma.js");
  const membership = await rawPrisma.membership.findFirst({
    where: { workspaceId, userId, status: "ACTIVE" },
    select: { id: true },
  });
  return membership !== null;
}
