import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export class TripTravelerRepository {
  /**
   * List travelers for a trip, ordered leader first then by name.
   * Every query filters by workspaceId to enforce tenancy.
   */
  static async listByTrip(
    tripId: string,
    workspaceId: string,
  ): Promise<Prisma.TripTravelerGetPayload<object>[]> {
    return prisma.tripTraveler.findMany({
      where: { tripId, workspaceId },
      orderBy: [{ isTripLeader: "desc" }, { fullName: "asc" }],
    });
  }

  static async findById(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.TripTravelerGetPayload<object> | null> {
    return prisma.tripTraveler.findFirst({
      where: { id, workspaceId },
    });
  }

  static async create(
    workspaceId: string,
    tripId: string,
    data: Prisma.TripTravelerUncheckedCreateInput,
  ): Promise<Prisma.TripTravelerGetPayload<object>> {
    return prisma.tripTraveler.create({
      data: { ...data, workspaceId, tripId },
    });
  }

  static async createMany(
    workspaceId: string,
    tripId: string,
    items: Prisma.TripTravelerUncheckedCreateInput[],
  ): Promise<number> {
    const result = await prisma.tripTraveler.createMany({
      data: items.map((item) => ({ ...item, workspaceId, tripId })),
    });
    return result.count;
  }

  static async findLeader(
    tripId: string,
    workspaceId: string,
  ): Promise<Prisma.TripTravelerGetPayload<object> | null> {
    return prisma.tripTraveler.findFirst({
      where: { tripId, workspaceId, isTripLeader: true },
    });
  }

  static async update(
    id: string,
    workspaceId: string,
    data: Prisma.TripTravelerUncheckedUpdateInput,
  ): Promise<Prisma.TripTravelerGetPayload<object>> {
    return prisma.tripTraveler.update({
      where: { id },
      data,
    });
  }

  static async delete(
    id: string,
    workspaceId: string,
  ): Promise<Prisma.TripTravelerGetPayload<object>> {
    return prisma.tripTraveler.delete({ where: { id } });
  }
}
