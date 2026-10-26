import type { Prisma } from "@prisma/client";
import type { TripTravelerDetail } from '@trailcomand/shared';
import type { CreateTripTravelerInput } from '@trailcomand/shared';
import type { UpdateTripTravelerInput } from '@trailcomand/shared';

import { AppError } from "../../lib/errors.js";
import { rawPrisma } from "../../lib/prisma.js";
import { logAuditEvent } from "../../lib/audit.js";
import { TripRepository } from "../trip/trip.repository.js";
import { TripTravelerRepository } from "./trip-traveler.repository.js";

function toTravelerDetail(t: Prisma.TripTravelerGetPayload<object>): TripTravelerDetail {
  return {
    id: t.id,
    workspaceId: t.workspaceId,
    tripId: t.tripId,
    customerId: t.customerId,
    fullName: t.fullName,
    email: t.email,
    phone: t.phone,
    nationality: t.nationality,
    dateOfBirth: t.dateOfBirth ? t.dateOfBirth.toISOString() : null,
    passportNumber: t.passportNumber,
    passportExpiry: t.passportExpiry ? t.passportExpiry.toISOString() : null,
    emergencyContactName: t.emergencyContactName,
    emergencyContactPhone: t.emergencyContactPhone,
    dietaryRequirements: t.dietaryRequirements,
    medicalNotes: t.medicalNotes,
    insuranceProvider: t.insuranceProvider,
    insurancePolicyNumber: t.insurancePolicyNumber,
    isTripLeader: t.isTripLeader,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function toUnchecked(
  input: CreateTripTravelerInput | UpdateTripTravelerInput,
): Prisma.TripTravelerUncheckedCreateInput {
  return {
    ...(input.customerId !== undefined ? { customerId: input.customerId ?? null } : {}),
    ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
    ...(input.email !== undefined ? { email: input.email ?? null } : {}),
    ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
    ...(input.nationality !== undefined ? { nationality: input.nationality ?? null } : {}),
    ...(input.dateOfBirth !== undefined
      ? { dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null }
      : {}),
    ...(input.passportNumber !== undefined
      ? { passportNumber: input.passportNumber ?? null }
      : {}),
    ...(input.passportExpiry !== undefined
      ? { passportExpiry: input.passportExpiry ? new Date(input.passportExpiry) : null }
      : {}),
    ...(input.emergencyContactName !== undefined
      ? { emergencyContactName: input.emergencyContactName ?? null }
      : {}),
    ...(input.emergencyContactPhone !== undefined
      ? { emergencyContactPhone: input.emergencyContactPhone ?? null }
      : {}),
    ...(input.dietaryRequirements !== undefined
      ? { dietaryRequirements: input.dietaryRequirements ?? null }
      : {}),
    ...(input.medicalNotes !== undefined
      ? { medicalNotes: input.medicalNotes ?? null }
      : {}),
    ...(input.insuranceProvider !== undefined
      ? { insuranceProvider: input.insuranceProvider ?? null }
      : {}),
    ...(input.insurancePolicyNumber !== undefined
      ? { insurancePolicyNumber: input.insurancePolicyNumber ?? null }
      : {}),
    ...(input.isTripLeader !== undefined ? { isTripLeader: input.isTripLeader } : {}),
    ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
  } as Prisma.TripTravelerUncheckedCreateInput;
}

export class TripTravelerService {
  static async listTravelers(
    workspaceId: string,
    tripId: string,
  ): Promise<TripTravelerDetail[]> {
    // Assert the trip belongs to the workspace before listing.
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found");
    }
    const travelers = await TripTravelerRepository.listByTrip(tripId, workspaceId);
    return travelers.map(toTravelerDetail);
  }

  static async getTraveler(
    workspaceId: string,
    tripId: string,
    travelerId: string,
  ): Promise<TripTravelerDetail> {
    const traveler = await TripTravelerRepository.findById(travelerId, workspaceId);
    if (!traveler || traveler.tripId !== tripId) {
      throw AppError.notFound("Traveler not found");
    }
    return toTravelerDetail(traveler);
  }

  static async addTraveler(
    workspaceId: string,
    userId: string,
    tripId: string,
    input: CreateTripTravelerInput,
  ): Promise<TripTravelerDetail> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }

    // Customer, if referenced, must exist in the workspace.
    if (input.customerId) {
      const customer = await rawPrisma.customer.findFirst({
        where: { id: input.customerId, workspaceId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) {
        throw AppError.notFound("Customer not found in this workspace");
      }
    }

    // Only one trip leader per trip.
    if (input.isTripLeader) {
      const leader = await TripTravelerRepository.findLeader(tripId, workspaceId);
      if (leader) {
        throw AppError.conflict("Trip already has a trip leader");
      }
    }

    const created = await TripTravelerRepository.create(
      workspaceId,
      tripId,
      toUnchecked(input),
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.traveler.added",
      entityType: "trip_traveler",
      entityId: created.id,
      details: { tripId, fullName: created.fullName, isTripLeader: created.isTripLeader },
    });

    return toTravelerDetail(created);
  }

  static async bulkAddTravelers(
    workspaceId: string,
    userId: string,
    tripId: string,
    items: CreateTripTravelerInput[],
  ): Promise<{ added: number; travelers: TripTravelerDetail[] }> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }

    const hasLeaderItem = items.some((item) => item.isTripLeader);
    if (hasLeaderItem) {
      const leader = await TripTravelerRepository.findLeader(tripId, workspaceId);
      if (leader) {
        throw AppError.conflict("Trip already has a trip leader");
      }
      // Also reject duplicate leaders within the batch itself.
      const leaderCount = items.filter((item) => item.isTripLeader).length;
      if (leaderCount > 1) {
        throw AppError.conflict("Only one trip leader is allowed per trip");
      }
    }

    // Validate optional customer references in bulk.
    for (const item of items) {
      if (item.customerId) {
        const customer = await rawPrisma.customer.findFirst({
          where: { id: item.customerId, workspaceId, deletedAt: null },
          select: { id: true },
        });
        if (!customer) {
          throw AppError.notFound("Customer not found in this workspace");
        }
      }
    }

    const count = await TripTravelerRepository.createMany(
      workspaceId,
      tripId,
      items.map((item) => toUnchecked(item)),
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.travelers.bulk_added",
      entityType: "trip_traveler",
      entityId: tripId,
      details: { tripId, count },
    });

    const travelers = await TripTravelerRepository.listByTrip(tripId, workspaceId);
    return { added: count, travelers: travelers.map(toTravelerDetail) };
  }

  static async updateTraveler(
    workspaceId: string,
    userId: string,
    tripId: string,
    travelerId: string,
    input: UpdateTripTravelerInput,
  ): Promise<TripTravelerDetail> {
    const existing = await TripTravelerRepository.findById(travelerId, workspaceId);
    if (!existing || existing.tripId !== tripId) {
      throw AppError.notFound("Traveler not found");
    }

    // Promoting to leader: enforce single-leader rule.
    if (input.isTripLeader && !existing.isTripLeader) {
      const leader = await TripTravelerRepository.findLeader(tripId, workspaceId);
      if (leader && leader.id !== travelerId) {
        throw AppError.conflict("Trip already has a trip leader");
      }
    }

    const updated = await TripTravelerRepository.update(
      travelerId,
      workspaceId,
      toUnchecked(input),
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.traveler.updated",
      entityType: "trip_traveler",
      entityId: travelerId,
      details: { tripId, changedFields: Object.keys(input) },
    });

    return toTravelerDetail(updated);
  }

  static async deleteTraveler(
    workspaceId: string,
    userId: string,
    tripId: string,
    travelerId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await TripTravelerRepository.findById(travelerId, workspaceId);
    if (!existing || existing.tripId !== tripId) {
      throw AppError.notFound("Traveler not found");
    }

    await TripTravelerRepository.delete(travelerId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "trip.traveler.deleted",
      entityType: "trip_traveler",
      entityId: travelerId,
      details: { tripId, fullName: existing.fullName },
    });

    return { success: true, id: travelerId };
  }
}
