import type { Prisma } from "@prisma/client";
import type { ListInquiriesQuery } from "@tripchange/shared";

import { rawPrisma } from "../../lib/prisma.js";

export class InquiryRepository {
  /**
   * List inquiries scoped to a workspace.
   * Every query filters by workspaceId to enforce tenancy.
   */
  static async listInquiries(
    workspaceId: string,
    filter: ListInquiriesQuery,
  ): Promise<{ total: number; items: Prisma.InquiryGetPayload<object>[] }> {
    const where: Prisma.InquiryWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.priority ? { priority: filter.priority } : {}),
      ...(filter.assignedToId ? { assignedToId: filter.assignedToId } : {}),
      ...(filter.search
        ? {
            OR: [
              { inquiryNumber: { contains: filter.search, mode: "insensitive" } },
              { trekInterest: { contains: filter.search, mode: "insensitive" } },
              {
                customer: {
                  fullName: { contains: filter.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      rawPrisma.inquiry.count({ where }),
      rawPrisma.inquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filter.limit,
        skip: filter.offset,
      }),
    ]);

    return { total, items };
  }

  static async findById(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.InquiryGetPayload<object> | null> {
    return rawPrisma.inquiry.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
  }

  static async findByIdWithActivities(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.InquiryGetPayload<{ include: { activities: true } }> | null> {
    return rawPrisma.inquiry.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
  }

  static async findByInquiryNumber(
    workspaceId: string,
    inquiryNumber: string,
  ): Promise<Prisma.InquiryGetPayload<object> | null> {
    return rawPrisma.inquiry.findFirst({
      where: { workspaceId, inquiryNumber, deletedAt: null },
    });
  }

  /**
   * Count inquiries created in the given calendar year for numbering.
   * Uses the unique (workspaceId, inquiryNumber) constraint.
   */
  static async countByYear(workspaceId: string, year: number): Promise<number> {
    return rawPrisma.inquiry.count({
      where: {
        workspaceId,
        inquiryNumber: { startsWith: `INQ-${year}-` },
      },
    });
  }

  static async create(
    workspaceId: string,
    data: {
      customerId: string;
      inquiryNumber: string;
      trekInterest?: string | null;
      destinationText?: string | null;
      preferredStart?: Date | null;
      preferredEnd?: Date | null;
      flexibleDates: boolean;
      groupSize: number;
      adults: number;
      children: number;
      specialRequirements?: string | null;
      budgetExpectation?: Prisma.Decimal | null;
      budgetCurrency: string;
      priority: Prisma.InquiryCreateInput["priority"];
      source?: string | null;
      nextFollowUpAt?: Date | null;
      notes?: string | null;
      metadata: Prisma.InputJsonValue;
    },
  ): Promise<Prisma.InquiryGetPayload<object>> {
    return rawPrisma.inquiry.create({
      data: {
        workspaceId,
        customerId: data.customerId,
        inquiryNumber: data.inquiryNumber,
        trekInterest: data.trekInterest ?? null,
        destinationText: data.destinationText ?? null,
        preferredStart: data.preferredStart ?? null,
        preferredEnd: data.preferredEnd ?? null,
        flexibleDates: data.flexibleDates,
        groupSize: data.groupSize,
        adults: data.adults,
        children: data.children,
        specialRequirements: data.specialRequirements ?? null,
        budgetExpectation: data.budgetExpectation ?? null,
        budgetCurrency: data.budgetCurrency,
        priority: data.priority,
        source: data.source ?? null,
        nextFollowUpAt: data.nextFollowUpAt ?? null,
        notes: data.notes ?? null,
        metadata: data.metadata,
      },
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.InquiryUpdateInput,
  ): Promise<Prisma.InquiryGetPayload<object>> {
    const existing = await rawPrisma.inquiry.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error("Inquiry not found in workspace");
    }

    return rawPrisma.inquiry.update({
      where: { id },
      data,
    });
  }

  static async softDelete(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.InquiryGetPayload<object>> {
    const existing = await rawPrisma.inquiry.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error("Inquiry not found in workspace");
    }

    return rawPrisma.inquiry.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  static async createActivity(
    workspaceId: string,
    data: {
      inquiryId: string;
      userId?: string | null;
      activityType: string;
      description: string;
      metadata: Prisma.InputJsonValue;
    },
  ): Promise<Prisma.InquiryActivityGetPayload<object>> {
    return rawPrisma.inquiryActivity.create({
      data: {
        workspaceId,
        inquiryId: data.inquiryId,
        userId: data.userId ?? null,
        activityType: data.activityType,
        description: data.description,
        metadata: data.metadata,
      },
    });
  }

  static async listActivities(
    workspaceId: string,
    inquiryId: string,
  ): Promise<Prisma.InquiryActivityGetPayload<object>[]> {
    return rawPrisma.inquiryActivity.findMany({
      where: { workspaceId, inquiryId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
