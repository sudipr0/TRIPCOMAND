import type { Prisma } from "@prisma/client";
import { ResourceAssignmentRepository } from "./resource-assignment.repository.js";
import { TripRepository } from "../trip/trip.repository.js";
import { ResourceRepository } from "../resource/resource.repository.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import type {
  CreateResourceAssignmentInput,
  UpdateResourceAssignmentInput,
  ListResourceAssignmentsQuery,
  ResourceAssignmentDetail,
  ListResourceAssignmentsResult,
  AvailabilityResult,
  CheckAvailabilityQuery,
} from "@tripchange/shared";

type RepoAssignment = NonNullable<
  Awaited<ReturnType<typeof ResourceAssignmentRepository.findById>>
>;

function toResourceAssignmentDetail(
  a: RepoAssignment | Prisma.ResourceAssignmentGetPayload<object>,
): ResourceAssignmentDetail {
  const withRelations = a as RepoAssignment;
  return {
    id: a.id,
    workspaceId: a.workspaceId,
    tripId: a.tripId,
    resourceId: a.resourceId,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate.toISOString(),
    status: a.status,
    notes: a.notes,
    metadata: a.metadata,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    resource: withRelations.resource
      ? {
          id: withRelations.resource.id,
          workspaceId: withRelations.resource.workspaceId,
          name: withRelations.resource.name,
          type: withRelations.resource.type,
          code: withRelations.resource.code,
          vehicleType: withRelations.resource.vehicleType,
          licensePlate: withRelations.resource.licensePlate,
          capacity: withRelations.resource.capacity,
          quantity: withRelations.resource.quantity,
          status: withRelations.resource.status,
          notes: withRelations.resource.notes,
          metadata: withRelations.resource.metadata,
          createdAt: withRelations.resource.createdAt.toISOString(),
          updatedAt: withRelations.resource.updatedAt.toISOString(),
          deletedAt: withRelations.resource.deletedAt
            ? withRelations.resource.deletedAt.toISOString()
            : null,
        }
      : undefined,
    trip: withRelations.trip
      ? {
          id: withRelations.trip.id,
          tripNumber: withRelations.trip.tripNumber,
          name: withRelations.trip.name,
          startDate: withRelations.trip.startDate.toISOString(),
          endDate: withRelations.trip.endDate.toISOString(),
        }
      : undefined,
  };
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PROPOSED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED", "COMPLETED"],
  CANCELLED: [],
  COMPLETED: [],
};

export class ResourceAssignmentService {
  static async listAssignments(
    workspaceId: string,
    filter: ListResourceAssignmentsQuery,
  ): Promise<ListResourceAssignmentsResult> {
    const { total, items } = await ResourceAssignmentRepository.listAssignments(
      workspaceId,
      filter,
    );
    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map(toResourceAssignmentDetail),
    };
  }

  static async getAssignment(
    workspaceId: string,
    assignmentId: string,
  ): Promise<ResourceAssignmentDetail> {
    const assignment = await ResourceAssignmentRepository.findById(
      assignmentId,
      workspaceId,
    );
    if (!assignment) {
      throw AppError.notFound("Resource assignment not found");
    }
    return toResourceAssignmentDetail(assignment);
  }

  static async createAssignment(
    workspaceId: string,
    userId: string,
    input: CreateResourceAssignmentInput,
  ): Promise<ResourceAssignmentDetail> {
    const trip = await TripRepository.findById(input.tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }
    if (!["PLANNING", "READY"].includes(trip.status)) {
      throw AppError.conflict(
        `Cannot assign resource to trip with status ${trip.status}`,
      );
    }

    const resource = await ResourceRepository.findById(
      input.resourceId,
      workspaceId,
    );
    if (!resource) {
      throw AppError.notFound("Resource not found in this workspace");
    }
    if (resource.status === "INACTIVE") {
      throw AppError.conflict("Cannot assign an inactive resource");
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (startDate < trip.startDate || endDate > trip.endDate) {
      throw AppError.badRequest(
        `Assignment dates must fall within trip dates (${trip.startDate.toISOString().slice(0, 10)} - ${trip.endDate.toISOString().slice(0, 10)})`,
      );
    }

    // Conflict detection
    const conflicts = await ResourceAssignmentRepository.findOverlapping(
      input.resourceId,
      workspaceId,
      startDate,
      endDate,
    );
    if (conflicts.length > 0) {
      const conflictSummaries = conflicts.map((c) => ({
        id: c.id,
        tripId: c.tripId,
        tripName: c.trip?.name ?? "Unknown",
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        status: c.status,
      }));
      throw AppError.conflict("Resource has overlapping assignments", {
        code: "RESOURCE_CONFLICT",
        conflicts: conflictSummaries,
      });
    }

    const created = await ResourceAssignmentRepository.create(workspaceId, {
      tripId: input.tripId,
      resourceId: input.resourceId,
      startDate,
      endDate,
      status: "PROPOSED",
      notes: input.notes ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    });

    await logAuditEvent({
      workspaceId,
      userId,
      action: "resource_assignment.created",
      entityType: "resource_assignment",
      entityId: created.id,
      details: {
        tripId: input.tripId,
        resourceId: input.resourceId,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });

    return toResourceAssignmentDetail(created);
  }

  static async updateAssignment(
    workspaceId: string,
    userId: string,
    assignmentId: string,
    input: UpdateResourceAssignmentInput,
  ): Promise<ResourceAssignmentDetail> {
    const existing = await ResourceAssignmentRepository.findById(
      assignmentId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Resource assignment not found");
    }

    const startDate = input.startDate
      ? new Date(input.startDate)
      : existing.startDate;
    const endDate = input.endDate ? new Date(input.endDate) : existing.endDate;

    if (input.startDate || input.endDate) {
      const trip = await TripRepository.findById(existing.tripId, workspaceId);
      if (trip && (startDate < trip.startDate || endDate > trip.endDate)) {
        throw AppError.badRequest(
          "Assignment dates must fall within trip dates",
        );
      }

      const conflicts = await ResourceAssignmentRepository.findOverlapping(
        existing.resourceId,
        workspaceId,
        startDate,
        endDate,
        assignmentId,
      );
      if (conflicts.length > 0) {
        const conflictSummaries = conflicts.map((c) => ({
          id: c.id,
          tripId: c.tripId,
          tripName: c.trip?.name ?? "Unknown",
          startDate: c.startDate.toISOString(),
          endDate: c.endDate.toISOString(),
          status: c.status,
        }));
        throw AppError.conflict("Resource has overlapping assignments", {
          code: "RESOURCE_CONFLICT",
          conflicts: conflictSummaries,
        });
      }
    }

    const updated = await ResourceAssignmentRepository.update(
      assignmentId,
      workspaceId,
      {
        ...(input.startDate !== undefined ? { startDate } : {}),
        ...(input.endDate !== undefined ? { endDate } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.metadata !== undefined
          ? { metadata: input.metadata as Prisma.InputJsonValue }
          : {}),
      },
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "resource_assignment.updated",
      entityType: "resource_assignment",
      entityId: assignmentId,
      details: {
        tripId: existing.tripId,
        resourceId: existing.resourceId,
        changedFields: Object.keys(input),
      },
    });

    return toResourceAssignmentDetail(updated);
  }

  static async updateStatus(
    workspaceId: string,
    userId: string,
    assignmentId: string,
    status: string,
  ): Promise<ResourceAssignmentDetail> {
    const existing = await ResourceAssignmentRepository.findById(
      assignmentId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Resource assignment not found");
    }

    const allowed = VALID_STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      throw AppError.conflict(
        `Invalid status transition: ${existing.status} -> ${status}`,
      );
    }

    const updated = await ResourceAssignmentRepository.updateStatus(
      assignmentId,
      workspaceId,
      status as Prisma.ResourceAssignmentUpdateInput["status"],
    );

    await logAuditEvent({
      workspaceId,
      userId,
      action: "resource_assignment.status.changed",
      entityType: "resource_assignment",
      entityId: assignmentId,
      details: {
        tripId: existing.tripId,
        resourceId: existing.resourceId,
        from: existing.status,
        to: status,
      },
    });

    return toResourceAssignmentDetail(updated);
  }

  static async deleteAssignment(
    workspaceId: string,
    userId: string,
    assignmentId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await ResourceAssignmentRepository.findById(
      assignmentId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Resource assignment not found");
    }

    await ResourceAssignmentRepository.delete(assignmentId, workspaceId);

    await logAuditEvent({
      workspaceId,
      userId,
      action: "resource_assignment.deleted",
      entityType: "resource_assignment",
      entityId: assignmentId,
      details: {
        tripId: existing.tripId,
        resourceId: existing.resourceId,
      },
    });

    return { success: true, id: assignmentId };
  }

  static async checkAvailability(
    workspaceId: string,
    query: CheckAvailabilityQuery,
  ): Promise<AvailabilityResult> {
    const resourceId = query.resourceId ?? query.entityId;
    if (!resourceId) {
      throw AppError.badRequest("resourceId or entityId is required");
    }

    const resource = await ResourceRepository.findById(resourceId, workspaceId);
    if (!resource) {
      throw AppError.notFound("Resource not found in this workspace");
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const conflicts = await ResourceAssignmentRepository.findOverlapping(
      resourceId,
      workspaceId,
      startDate,
      endDate,
    );

    const conflictingAssignments = conflicts.map((c) => ({
      id: c.id,
      tripId: c.tripId,
      tripName: c.trip?.name ?? "Unknown",
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      status: c.status,
    }));

    return {
      entityType: "RESOURCE",
      entityId: resourceId,
      available: conflictingAssignments.length === 0,
      conflictingAssignments,
    };
  }

  static async listByTrip(
    workspaceId: string,
    tripId: string,
  ): Promise<ResourceAssignmentDetail[]> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }
    const assignments = await ResourceAssignmentRepository.listByTrip(
      tripId,
      workspaceId,
    );
    return assignments.map(toResourceAssignmentDetail);
  }

  static async listByResource(
    workspaceId: string,
    resourceId: string,
  ): Promise<ResourceAssignmentDetail[]> {
    const resource = await ResourceRepository.findById(resourceId, workspaceId);
    if (!resource) {
      throw AppError.notFound("Resource not found in this workspace");
    }
    const assignments = await ResourceAssignmentRepository.listByResource(
      resourceId,
      workspaceId,
    );
    return assignments.map(toResourceAssignmentDetail);
  }
}
