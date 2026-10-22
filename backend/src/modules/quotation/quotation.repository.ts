import type { Prisma } from "@prisma/client";
import type { ListQuotationsQuery } from '@tripchange/shared';
import type { CreateQuotationInput } from '@tripchange/shared';
import type { UpdateQuotationInput } from '@tripchange/shared';

import { rawPrisma, prisma } from "../../lib/prisma.js";

type QuotationInclude = {
  lineItems: true;
  versions: true;
  customer: { select: { id: true; fullName: true; email: true; phone: true } };
};

export class QuotationRepository {
  /**
   * List quotations scoped to a workspace.
   * Every query filters by workspaceId to enforce tenancy.
   */
  static async listQuotations(
    workspaceId: string,
    filter: ListQuotationsQuery,
  ): Promise<{ total: number; items: Prisma.QuotationGetPayload<object>[] }> {
    const where: Prisma.QuotationWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.inquiryId ? { inquiryId: filter.inquiryId } : {}),
      ...(filter.search
        ? {
            OR: [
              {
                quotationNumber: {
                  contains: filter.search,
                  mode: "insensitive",
                },
              },
              { trekName: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
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
  ): Promise<Prisma.QuotationGetPayload<{ include: QuotationInclude }> | null> {
    return prisma.quotation.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        lineItems: { orderBy: { createdAt: "asc" } },
        versions: { orderBy: { version: "desc" } },
        customer: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });
  }

  /**
   * Generate the next quotation number: QUO-YYYY-NNN.
   */
  static async generateNumber(
    workspaceId: string,
    tx: Prisma.TransactionClient = prisma as unknown as Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QUO-${year}-`;
    const rows = await tx.$queryRaw<{ maxnum: number | null }[]>`
      SELECT MAX(CAST(SUBSTRING(quotation_number FROM 'QUO-[0-9]+-([0-9]+)') AS INT)) AS maxnum
      FROM quotations
      WHERE workspace_id = ${workspaceId}
        AND quotation_number LIKE ${prefix + '%'}
    `;
    const next = (rows[0]?.maxnum ?? 0) + 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  static async create(
    workspaceId: string,
    data: {
      inquiryId?: string | null;
      customerId: string;
      quotationNumber: string;
      trekName: string;
      startDate: Date;
      endDate: Date;
      groupSize: number;
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
      currency: string;
      inclusions: string[];
      exclusions: string[];
      terms?: string | null;
      notes?: string | null;
      validUntil?: Date | null;
      lineItems: {
        category: string;
        description: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        total: number;
        isOptional: boolean;
      }[];
    },
  ): Promise<Prisma.QuotationGetPayload<{ include: QuotationInclude }>> {
    return prisma.quotation.create({
      data: {
        workspaceId,
        inquiryId: data.inquiryId ?? null,
        customerId: data.customerId,
        quotationNumber: data.quotationNumber,
        trekName: data.trekName,
        startDate: data.startDate,
        endDate: data.endDate,
        groupSize: data.groupSize,
        subtotal: data.subtotal,
        discount: data.discount,
        tax: data.tax,
        total: data.total,
        currency: data.currency,
        inclusions: data.inclusions,
        exclusions: data.exclusions,
        terms: data.terms ?? null,
        notes: data.notes ?? null,
        validUntil: data.validUntil ?? null,
        lineItems: {
          create: data.lineItems.map((item) => ({
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            total: item.total,
            isOptional: item.isOptional,
          })),
        },
      },
      include: {
        lineItems: { orderBy: { createdAt: "asc" } },
        versions: { orderBy: { version: "desc" } },
        customer: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: UpdateQuotationInput & { version: number },
  ): Promise<Prisma.QuotationGetPayload<{ include: QuotationInclude }>> {
    const { lineItems, version, ...rest } = data;
    return prisma.quotation.update({
      where: { id },
      data: {
        ...rest,
        version,
        ...(lineItems
          ? {
              lineItems: {
                deleteMany: {},
                create: lineItems.map((item) => ({
                  category: item.category,
                  description: item.description,
                  quantity: item.quantity,
                  unit: item.unit,
                  unitPrice: item.unitPrice,
                  total: item.quantity * item.unitPrice,
                  isOptional: item.isOptional,
                })),
              },
            }
          : {}),
      },
      include: {
        lineItems: { orderBy: { createdAt: "asc" } },
        versions: { orderBy: { version: "desc" } },
        customer: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });
  }

  static async updateStatus(
    id: string,
    workspaceId: string,
    status: string,
    extra?: Prisma.QuotationUpdateInput,
  ): Promise<Prisma.QuotationGetPayload<{ include: QuotationInclude }>> {
    return prisma.quotation.update({
      where: { id },
      data: { status: status as never, ...extra },
      include: {
        lineItems: { orderBy: { createdAt: "asc" } },
        versions: { orderBy: { version: "desc" } },
        customer: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });
  }

  static async softDelete(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.QuotationGetPayload<{ include: QuotationInclude }>> {
    return prisma.quotation.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        lineItems: { orderBy: { createdAt: "asc" } },
        versions: { orderBy: { version: "desc" } },
        customer: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });
  }

  static async findAllByInquiry(
    workspaceId: string,
    inquiryId: string,
  ): Promise<Prisma.QuotationGetPayload<object>[]> {
    return prisma.quotation.findMany({
      where: { workspaceId, inquiryId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  static async createVersionSnapshot(
    quotationId: string,
    version: number,
    snapshot: unknown,
    changedById?: string | null,
    changeReason?: string | null,
  ): Promise<void> {
    await prisma.quotationVersion.create({
      data: {
        quotationId,
        version,
        snapshot: snapshot as Prisma.InputJsonValue,
        changedById: changedById ?? null,
        changeReason: changeReason ?? null,
      },
    });
  }

  static async findByCustomerAndWorkspace(
    customerId: string,
    workspaceId: string,
  ): Promise<Prisma.QuotationGetPayload<object> | null> {
    return prisma.quotation.findFirst({
      where: { customerId, workspaceId, deletedAt: null },
    });
  }
}
