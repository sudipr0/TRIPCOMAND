import type { Prisma } from "@prisma/client";
import type { ListSuppliersQuery, SupplierCategory } from "@tripchange/shared";
import { prisma } from "../../lib/prisma.js";

export class SupplierRepository {
  /**
   * List suppliers scoped to workspace.
   * Search by name, code, contactName. Filter by category, region, status.
   */
  static async listSuppliers(
    workspaceId: string,
    filter: ListSuppliersQuery,
  ): Promise<{
    total: number;
    items: Prisma.SupplierGetPayload<object>[];
  }> {
    const where: Prisma.SupplierWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.region ? { region: filter.region } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: "insensitive" } },
              { code: { contains: filter.search, mode: "insensitive" } },
              { contactName: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        take: filter.limit,
        skip: filter.offset,
      }),
    ]);

    return { total, items };
  }

  static async findById(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.SupplierGetPayload<object> | null> {
    return prisma.supplier.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
  }

  static async findByName(
    name: string,
    workspaceId: string,
  ): Promise<Prisma.SupplierGetPayload<object> | null> {
    return prisma.supplier.findFirst({
      where: { name, workspaceId, deletedAt: null },
    });
  }

  /**
   * Find alternative suppliers in same category and optional region.
   * Active only, excludes self, ordered by rating desc (nulls last) then name asc.
   * Includes active rates to compute average rate.
   */
  static async findAlternatives(
    workspaceId: string,
    params: {
      category: SupplierCategory;
      region?: string | null;
      excludeId: string;
      limit: number;
    },
  ): Promise<
    Prisma.SupplierGetPayload<{
      include: { rates: true };
    }>[]
  > {
    const now = new Date();
    return prisma.supplier.findMany({
      where: {
        workspaceId,
        category: params.category,
        status: "ACTIVE",
        deletedAt: null,
        id: { not: params.excludeId },
        ...(params.region ? { region: params.region } : {}),
      },
      include: {
        rates: {
          where: {
            validFrom: { lte: now },
            OR: [{ validTo: null }, { validTo: { gte: now } }],
          },
        },
      },
      orderBy: [{ rating: "desc" }, { name: "asc" }],
      take: params.limit,
    });
  }

  static async create(
    workspaceId: string,
    data: Omit<Prisma.SupplierUncheckedCreateInput, "workspaceId">,
  ): Promise<Prisma.SupplierGetPayload<object>> {
    return prisma.supplier.create({
      data: { ...data, workspaceId },
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.SupplierUncheckedUpdateInput,
  ): Promise<Prisma.SupplierGetPayload<object>> {
    return prisma.supplier.update({
      where: { id },
      data,
    });
  }

  static async softDelete(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.SupplierGetPayload<object>> {
    return prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Supplier Rates
  // ───────────────────────────────────────────────────────────────────────────

  static async findRates(
    workspaceId: string,
    supplierId: string,
    activeOnly = false,
  ): Promise<Prisma.SupplierRateGetPayload<object>[]> {
    const now = new Date();
    return prisma.supplierRate.findMany({
      where: {
        workspaceId,
        supplierId,
        ...(activeOnly
          ? {
              validFrom: { lte: now },
              OR: [{ validTo: null }, { validTo: { gte: now } }],
            }
          : {}),
      },
      orderBy: { validFrom: "desc" },
    });
  }

  static async findRateById(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.SupplierRateGetPayload<object> | null> {
    return prisma.supplierRate.findFirst({
      where: { id, workspaceId },
    });
  }

  static async createRate(
    workspaceId: string,
    supplierId: string,
    data: Omit<
      Prisma.SupplierRateUncheckedCreateInput,
      "workspaceId" | "supplierId"
    >,
  ): Promise<Prisma.SupplierRateGetPayload<object>> {
    return prisma.supplierRate.create({
      data: { ...data, workspaceId, supplierId },
    });
  }

  static async updateRate(
    id: string,
    workspaceId: string,
    data: Prisma.SupplierRateUncheckedUpdateInput,
  ): Promise<Prisma.SupplierRateGetPayload<object>> {
    return prisma.supplierRate.update({
      where: { id },
      data,
    });
  }

  static async deleteRate(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.SupplierRateGetPayload<object>> {
    return prisma.supplierRate.delete({
      where: { id },
    });
  }

  static async countActiveBookings(
    workspaceId: string,
    supplierId: string,
  ): Promise<number> {
    return prisma.supplierBooking.count({
      where: {
        workspaceId,
        supplierId,
        deletedAt: null,
        status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
      },
    });
  }
}
