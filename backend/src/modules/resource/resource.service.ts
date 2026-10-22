import type { Prisma } from "@prisma/client";
import { ResourceRepository } from "./resource.repository.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import type {
  CreateResourceInput,
  UpdateResourceInput,
  ListResourcesQuery,
  ResourceDetail,
  ListResourcesResult,
} from "@tripchange/shared";

function toResourceDetail(
  r: Prisma.ResourceGetPayload<object>,
): ResourceDetail {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    name: r.name,
    type: r.type,
    code: r.code,
    vehicleType: r.vehicleType,
    licensePlate: r.licensePlate,
    capacity: r.capacity,
    quantity: r.quantity,
    status: r.status,
    notes: r.notes,
    metadata: r.metadata,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
  };
}

export class ResourceService {
  static async listResources(
    workspaceId: string,
    filter: ListResourcesQuery,
  ): Promise<ListResourcesResult> {
    const { total, items } = await ResourceRepository.listResources(
      workspaceId,
      filter,
    );
    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map(toResourceDetail),
    };
  }

  static async getResource(
    workspaceId: string,
    resourceId: string,
  ): Promise<ResourceDetail> {
    const resource = await ResourceRepository.findById(resourceId, workspaceId);
    if (!resource) {
      throw AppError.notFound("Resource not found");
    }
    return toResourceDetail(resource);
  }

  static async createResource(
    workspaceId: string,
    userId: string,
    input: CreateResourceInput,
  ): Promise<ResourceDetail> {
    const existing = await ResourceRepository.findByName(
      input.name,
      workspaceId,
    );
    if (existing) {
      throw AppError.conflict(
        `A resource with name "${input.name}" already exists in this workspace`,
      );
    }

    const created = await ResourceRepository.create(workspaceId, {
      name: input.name,
      type: input.type,
      code: input.code ?? null,
      vehicleType: input.vehicleType ?? null,
      licensePlate: input.licensePlate ?? null,
      capacity: input.capacity ?? null,
      quantity: input.quantity ?? null,
      status: input.status ?? "AVAILABLE",
      notes: input.notes ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "resource.created",
      entityType: "resource",
      entityId: created.id,
      details: {
        name: created.name,
        type: created.type,
        code: created.code,
      },
    });

    return toResourceDetail(created);
  }

  static async updateResource(
    workspaceId: string,
    userId: string,
    resourceId: string,
    input: UpdateResourceInput,
  ): Promise<ResourceDetail> {
    const existing = await ResourceRepository.findById(resourceId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Resource not found");
    }

    if (input.name && input.name !== existing.name) {
      const duplicate = await ResourceRepository.findByName(
        input.name,
        workspaceId,
      );
      if (duplicate && duplicate.id !== resourceId) {
        throw AppError.conflict(
          `A resource with name "${input.name}" already exists in this workspace`,
        );
      }
    }

    const updated = await ResourceRepository.update(resourceId, workspaceId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.vehicleType !== undefined
        ? { vehicleType: input.vehicleType }
        : {}),
      ...(input.licensePlate !== undefined
        ? { licensePlate: input.licensePlate }
        : {}),
      ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.metadata !== undefined
        ? { metadata: input.metadata as Prisma.InputJsonValue }
        : {}),
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "resource.updated",
      entityType: "resource",
      entityId: resourceId,
      details: {
        name: updated.name,
        changedFields: Object.keys(input),
      },
    });

    return toResourceDetail(updated);
  }

  static async deleteResource(
    workspaceId: string,
    userId: string,
    resourceId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await ResourceRepository.findById(resourceId, workspaceId);
    if (!existing) {
      throw AppError.notFound("Resource not found");
    }

    await ResourceRepository.softDelete(resourceId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "resource.deleted",
      entityType: "resource",
      entityId: resourceId,
      details: {
        name: existing.name,
      },
    });

    return { success: true, id: resourceId };
  }
}
