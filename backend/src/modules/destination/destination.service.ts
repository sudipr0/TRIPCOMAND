import type { Prisma } from "@prisma/client";

import { DestinationRepository } from "./destination.repository.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import type {
  CreateDestinationInput,
  UpdateDestinationInput,
  ListDestinationsQuery,
  DestinationDetail,
  ListDestinationsResult,
} from "@tripchange/shared";

function toDestinationDetail(destination: {
  id: string;
  workspaceId: string;
  name: string;
  region: string | null;
  country: string;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  altitude: number | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): DestinationDetail {
  return {
    id: destination.id,
    workspaceId: destination.workspaceId,
    name: destination.name,
    region: destination.region,
    country: destination.country,
    latitude:
      destination.latitude !== null ? destination.latitude.toString() : null,
    longitude:
      destination.longitude !== null ? destination.longitude.toString() : null,
    altitude: destination.altitude,
    description: destination.description,
    imageUrl: destination.imageUrl,
    createdAt: destination.createdAt.toISOString(),
    updatedAt: destination.updatedAt.toISOString(),
    deletedAt: destination.deletedAt
      ? destination.deletedAt.toISOString()
      : null,
  };
}

export class DestinationService {
  static async listDestinations(
    workspaceId: string,
    filter: ListDestinationsQuery,
  ): Promise<ListDestinationsResult> {
    const { total, items } = await DestinationRepository.listDestinations(
      workspaceId,
      filter,
    );

    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map(toDestinationDetail),
    };
  }

  static async getDestination(
    workspaceId: string,
    destinationId: string,
  ): Promise<DestinationDetail> {
    const destination = await DestinationRepository.findById(
      destinationId,
      workspaceId,
    );
    if (!destination) {
      throw AppError.notFound("Destination not found");
    }
    return toDestinationDetail(destination);
  }

  static async createDestination(
    workspaceId: string,
    userId: string,
    input: CreateDestinationInput,
  ): Promise<DestinationDetail> {
    const existing = await DestinationRepository.findByName(
      input.name,
      workspaceId,
    );
    if (existing) {
      throw AppError.conflict(
        "A destination with this name already exists in this workspace",
      );
    }

    const created = await DestinationRepository.create(workspaceId, {
      name: input.name,
      region: input.region ?? null,
      country: input.country,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      altitude: input.altitude ?? null,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "destination.created",
      entityType: "destination",
      entityId: created.id,
      details: { name: created.name, country: created.country },
    });

    return toDestinationDetail(created);
  }

  static async updateDestination(
    workspaceId: string,
    destinationId: string,
    userId: string,
    input: UpdateDestinationInput,
  ): Promise<DestinationDetail> {
    const existing = await DestinationRepository.findById(
      destinationId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Destination not found");
    }

    if (input.name !== undefined && input.name !== existing.name) {
      const duplicate = await DestinationRepository.findByName(
        input.name,
        workspaceId,
      );
      if (duplicate) {
        throw AppError.conflict(
          "A destination with this name already exists in this workspace",
        );
      }
    }

    const updateData: Prisma.DestinationUpdateInput = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.region !== undefined) updateData.region = input.region;
    if (input.country !== undefined) updateData.country = input.country;
    if (input.latitude !== undefined) updateData.latitude = input.latitude;
    if (input.longitude !== undefined) updateData.longitude = input.longitude;
    if (input.altitude !== undefined) updateData.altitude = input.altitude;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;

    const updated = await DestinationRepository.update(
      destinationId,
      workspaceId,
      updateData,
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "destination.updated",
      entityType: "destination",
      entityId: destinationId,
      details: { changedFields: Object.keys(updateData) },
    });

    return toDestinationDetail(updated);
  }

  static async deleteDestination(
    workspaceId: string,
    destinationId: string,
    userId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await DestinationRepository.findById(
      destinationId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Destination not found");
    }

    await DestinationRepository.softDelete(destinationId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "destination.deleted",
      entityType: "destination",
      entityId: destinationId,
      details: { name: existing.name },
    });

    return { success: true, id: destinationId };
  }
}
