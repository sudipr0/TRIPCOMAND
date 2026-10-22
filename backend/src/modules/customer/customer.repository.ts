import type { Prisma } from "@prisma/client";
import { rawPrisma } from "../../lib/prisma.js";
import type { ListCustomersQuery } from "./customer.schemas.js";

export class CustomerRepository {
  /**
   * List customers scoped to a workspace.
   * Every query filters by workspaceId to enforce tenancy.
   */
  static async listCustomers(
    workspaceId: string,
    filter: ListCustomersQuery,
  ): Promise<{ total: number; items: Prisma.CustomerGetPayload<object>[] }> {
    const where: Prisma.CustomerWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(filter.customerType ? { customerType: filter.customerType } : {}),
      ...(filter.search
        ? {
            OR: [
              { fullName: { contains: filter.search, mode: "insensitive" } },
              { email: { contains: filter.search, mode: "insensitive" } },
              { phone: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      rawPrisma.customer.count({ where }),
      rawPrisma.customer.findMany({
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
  ): Promise<Prisma.CustomerGetPayload<object> | null> {
    return rawPrisma.customer.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
  }

  static async findByIdAndWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.CustomerGetPayload<object> | null> {
    return rawPrisma.customer.findFirst({
      where: { id, workspaceId },
    });
  }

  static async findByEmail(
    email: string,
    workspaceId: string,
  ): Promise<Prisma.CustomerGetPayload<object> | null> {
    return rawPrisma.customer.findFirst({
      where: { email, workspaceId, deletedAt: null },
    });
  }

  static async create(
    workspaceId: string,
    data: {
      customerType: Prisma.CustomerCreateInput["customerType"];
      fullName: string;
      email?: string | null;
      phone?: string | null;
      whatsapp?: string | null;
      nationality?: string | null;
      address?: string | null;
      dateOfBirth?: Date | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      source?: string | null;
      tags: string[];
      notes?: string | null;
      metadata: Prisma.InputJsonValue;
    },
  ): Promise<Prisma.CustomerGetPayload<object>> {
    return rawPrisma.customer.create({
      data: {
        workspaceId,
        customerType: data.customerType,
        fullName: data.fullName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        whatsapp: data.whatsapp ?? null,
        nationality: data.nationality ?? null,
        address: data.address ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        emergencyContactName: data.emergencyContactName ?? null,
        emergencyContactPhone: data.emergencyContactPhone ?? null,
        source: data.source ?? null,
        tags: data.tags,
        notes: data.notes ?? null,
        metadata: data.metadata,
      },
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.CustomerUpdateInput,
  ): Promise<Prisma.CustomerGetPayload<object>> {
    // Guard tenancy by asserting existence within workspace first.
    const existing = await rawPrisma.customer.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error("Customer not found in workspace");
    }

    return rawPrisma.customer.update({
      where: { id },
      data,
    });
  }

  static async softDelete(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.CustomerGetPayload<object>> {
    const existing = await rawPrisma.customer.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error("Customer not found in workspace");
    }

    return rawPrisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
