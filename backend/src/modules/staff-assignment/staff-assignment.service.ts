import type { Prisma } from "@prisma/client";
import { StaffAssignmentRepository } from "./staff-assignment.repository.js";
import { TripRepository } from "../trip/trip.repository.js";
import { rawPrisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { logAuditEvent } from "../../lib/audit.js";
import type {
  CreateStaffAssignmentInput,
  UpdateStaffAssignmentInput,
  ListStaffAssignmentsQuery,
  StaffAssignmentDetail,
  ListStaffAssignmentsResult,
  AvailabilityResult,
  CheckAvailabilityQuery,
} from "@tripchange/shared";

type RepoAssignment = NonNullable<
  Awaited<ReturnType<typeof StaffAssignmentRepository.findById>>
>;

function toStaffAssignmentDetail(
  a: RepoAssignment | Prisma.StaffAssignmentGetPayload<object>,
): StaffAssignmentDetail {
  const withRelations = a as RepoAssignment;
  return {
    id: a.id,
    workspaceId: a.workspaceId,
    tripId: a.tripId,
    staffId: a.staffId,
    role: a.role,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate.toISOString(),
    status: a.status,
    agreedRate:
      a.agreedRate !== null && a.agreedRate !== undefined
        ? a.agreedRate.toString()
        : null,
    currency: a.currency,
    confirmedAt: a.confirmedAt ? a.confirmedAt.toISOString() : null,
    confirmedById: a.confirmedById,
    notes: a.notes,
    metadata: a.metadata,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    deletedAt: a.deletedAt ? a.deletedAt.toISOString() : null,
    staff: withRelations.staff
      ? {
          id: withRelations.staff.id,
          fullName: withRelations.staff.fullName,
          staffType: withRelations.staff.staffType,
          phone: withRelations.staff.phone,
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
  PROPOSED: ["CONFIRMED", "DECLINED", "CANCELLED"],
  CONFIRMED: ["CANCELLED", "COMPLETED"],
  DECLINED: [],
  CANCELLED: [],
  COMPLETED: [],
};

export class StaffAssignmentService {
  static async listAssignments(
    workspaceId: string,
    filter: ListStaffAssignmentsQuery,
  ): Promise<ListStaffAssignmentsResult> {
    const { total, items } = await StaffAssignmentRepository.listAssignments(
      workspaceId,
      filter,
    );
    return {
      total,
      limit: filter.limit,
      offset: filter.offset,
      items: items.map(toStaffAssignmentDetail),
    };
  }

  static async getAssignment(
    workspaceId: string,
    assignmentId: string,
  ): Promise<StaffAssignmentDetail> {
    const assignment = await StaffAssignmentRepository.findById(
      assignmentId,
      workspaceId,
    );
    if (!assignment) {
      throw AppError.notFound("Staff assignment not found");
    }
    return toStaffAssignmentDetail(assignment);
  }

  static async createAssignment(
    workspaceId: string,
    userId: string,
    input: CreateStaffAssignmentInput,
  ): Promise<StaffAssignmentDetail> {
    // Assert trip exists in workspace and is in an assignable status (PLANNING or READY)
    const trip = await TripRepository.findById(input.tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }
    if (!["PLANNING", "READY"].includes(trip.status)) {
      throw AppError.conflict(
        `Cannot assign staff to trip with status ${trip.status}`,
      );
    }

    // Assert staff profile exists in workspace and is not INACTIVE
    const staff = await rawPrisma.staffProfile.findFirst({
      where: { id: input.staffId, workspaceId, deletedAt: null },
    });
    if (!staff) {
      throw AppError.notFound("Staff profile not found in this workspace");
    }
    if (staff.status === "INACTIVE") {
      throw AppError.conflict("Cannot assign an inactive staff member");
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    // Assert assignment dates fall within trip dates
    if (startDate < trip.startDate || endDate > trip.endDate) {
      throw AppError.badRequest(
        `Assignment dates (${startDate.toISOString().slice(0, 10)} - ${endDate.toISOString().slice(0, 10)}) must be within trip dates (${trip.startDate.toISOString().slice(0, 10)} - ${trip.endDate.toISOString().slice(0, 10)})`,
      );
    }

    // Conflict detection: overlapping assignments for this staff member
    const conflicts = await StaffAssignmentRepository.findOverlapping(
      input.staffId,
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
      throw AppError.conflict("Staff member has overlapping assignments", {
        code: "STAFF_CONFLICT",
        conflicts: conflictSummaries,
      });
    }

    const created = await StaffAssignmentRepository.create(workspaceId, {
      tripId: input.tripId,
      staffId: input.staffId,
      role: input.role,
      startDate,
      endDate,
      status: "PROPOSED",
      agreedRate: input.agreedRate !== undefined ? input.agreedRate : null,
      currency: input.currency ?? "NPR",
      notes: input.notes ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    });

    // Auto-sync: role='lead_guide' sets Trip.leadGuideId
    if (input.role.toLowerCase() === "lead_guide") {
      await TripRepository.assign(input.tripId, workspaceId, {
        leadGuideId: input.staffId,
      });
    }

    await logAuditEvent({
      workspaceId,
      userId,
      action: "staff_assignment.created",
      entityType: "staff_assignment",
      entityId: created.id,
      details: {
        tripId: input.tripId,
        staffId: input.staffId,
        role: input.role,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });

    return toStaffAssignmentDetail(created);
  }

  static async updateAssignment(
    workspaceId: string,
    userId: string,
    assignmentId: string,
    input: UpdateStaffAssignmentInput,
  ): Promise<StaffAssignmentDetail> {
    const existing = await StaffAssignmentRepository.findById(
      assignmentId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Staff assignment not found");
    }

    const startDate = input.startDate
      ? new Date(input.startDate)
      : existing.startDate;
    const endDate = input.endDate ? new Date(input.endDate) : existing.endDate;

    if (input.startDate || input.endDate) {
      const trip = await TripRepository.findById(existing.tripId, workspaceId);
      if (trip && (startDate < trip.startDate || endDate > trip.endDate)) {
        throw AppError.badRequest("Assignment dates must be within trip dates");
      }

      // Re-check conflicts (excluding this assignment)
      const conflicts = await StaffAssignmentRepository.findOverlapping(
        existing.staffId,
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
        throw AppError.conflict("Staff member has overlapping assignments", {
          code: "STAFF_CONFLICT",
          conflicts: conflictSummaries,
        });
      }
    }

    const updated = await StaffAssignmentRepository.update(
      assignmentId,
      workspaceId,
      {
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.startDate !== undefined ? { startDate } : {}),
        ...(input.endDate !== undefined ? { endDate } : {}),
        ...(input.agreedRate !== undefined
          ? { agreedRate: input.agreedRate }
          : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.metadata !== undefined
          ? { metadata: input.metadata as Prisma.InputJsonValue }
          : {}),
      },
    );

    // Auto-sync lead_guide role
    if (input.role !== undefined) {
      const newIsLead = input.role.toLowerCase() === "lead_guide";
      const oldIsLead = existing.role.toLowerCase() === "lead_guide";
      if (newIsLead && !oldIsLead) {
        await TripRepository.assign(existing.tripId, workspaceId, {
          leadGuideId: existing.staffId,
        });
      } else if (!newIsLead && oldIsLead) {
        const trip = await TripRepository.findById(
          existing.tripId,
          workspaceId,
        );
        if (trip && trip.leadGuideId === existing.staffId) {
          await TripRepository.assign(existing.tripId, workspaceId, {
            leadGuideId: null,
          });
        }
      }
    }

    await logAuditEvent({
      workspaceId,
      userId,
      action: "staff_assignment.updated",
      entityType: "staff_assignment",
      entityId: assignmentId,
      details: {
        tripId: existing.tripId,
        staffId: existing.staffId,
        changedFields: Object.keys(input),
      },
    });

    return toStaffAssignmentDetail(updated);
  }

  static async updateStatus(
    workspaceId: string,
    userId: string,
    assignmentId: string,
    status: string,
    notes?: string,
  ): Promise<StaffAssignmentDetail> {
    const existing = await StaffAssignmentRepository.findById(
      assignmentId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Staff assignment not found");
    }

    const allowed = VALID_STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(status)) {
      throw AppError.conflict(
        `Invalid status transition: ${existing.status} -> ${status}`,
      );
    }

    const extra: Prisma.StaffAssignmentUpdateInput = {};
    if (status === "CONFIRMED") {
      extra.confirmedAt = new Date();
      extra.confirmedById = userId;
    }
    if (notes !== undefined) {
      extra.notes = notes;
    }

    const updated = await StaffAssignmentRepository.updateStatus(
      assignmentId,
      workspaceId,
      status as Prisma.StaffAssignmentUpdateInput["status"],
      extra,
    );

    // If cancelled and this staff was lead guide, clear Trip.leadGuideId
    if (status === "CANCELLED" || status === "DECLINED") {
      const trip = await TripRepository.findById(existing.tripId, workspaceId);
      if (trip && trip.leadGuideId === existing.staffId) {
        await TripRepository.assign(existing.tripId, workspaceId, {
          leadGuideId: null,
        });
      }
    }

    await logAuditEvent({
      workspaceId,
      userId,
      action: "staff_assignment.status.changed",
      entityType: "staff_assignment",
      entityId: assignmentId,
      details: {
        tripId: existing.tripId,
        staffId: existing.staffId,
        from: existing.status,
        to: status,
      },
    });

    return toStaffAssignmentDetail(updated);
  }

  static async deleteAssignment(
    workspaceId: string,
    userId: string,
    assignmentId: string,
  ): Promise<{ success: true; id: string }> {
    const existing = await StaffAssignmentRepository.findById(
      assignmentId,
      workspaceId,
    );
    if (!existing) {
      throw AppError.notFound("Staff assignment not found");
    }

    await StaffAssignmentRepository.softDelete(assignmentId, workspaceId);

    // If this staff was lead guide on the trip, clear it
    const trip = await TripRepository.findById(existing.tripId, workspaceId);
    if (trip && trip.leadGuideId === existing.staffId) {
      await TripRepository.assign(existing.tripId, workspaceId, {
        leadGuideId: null,
      });
    }

    await logAuditEvent({
      workspaceId,
      userId,
      action: "staff_assignment.deleted",
      entityType: "staff_assignment",
      entityId: assignmentId,
      details: {
        tripId: existing.tripId,
        staffId: existing.staffId,
      },
    });

    return { success: true, id: assignmentId };
  }

  static async checkAvailability(
    workspaceId: string,
    query: CheckAvailabilityQuery,
  ): Promise<AvailabilityResult> {
    const staffId = query.staffId ?? query.entityId;
    if (!staffId) {
      throw AppError.badRequest("staffId or entityId is required");
    }

    const staff = await rawPrisma.staffProfile.findFirst({
      where: { id: staffId, workspaceId, deletedAt: null },
    });
    if (!staff) {
      throw AppError.notFound("Staff profile not found in this workspace");
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const conflicts = await StaffAssignmentRepository.findOverlapping(
      staffId,
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
      entityType: "STAFF",
      entityId: staffId,
      available: conflictingAssignments.length === 0,
      conflictingAssignments,
    };
  }

  static async listByTrip(
    workspaceId: string,
    tripId: string,
  ): Promise<StaffAssignmentDetail[]> {
    const trip = await TripRepository.findById(tripId, workspaceId);
    if (!trip) {
      throw AppError.notFound("Trip not found in this workspace");
    }
    const assignments = await StaffAssignmentRepository.listByTrip(
      tripId,
      workspaceId,
    );
    return assignments.map(toStaffAssignmentDetail);
  }

  static async listByStaff(
    workspaceId: string,
    staffId: string,
  ): Promise<StaffAssignmentDetail[]> {
    const staff = await rawPrisma.staffProfile.findFirst({
      where: { id: staffId, workspaceId, deletedAt: null },
    });
    if (!staff) {
      throw AppError.notFound("Staff profile not found in this workspace");
    }
    const assignments = await StaffAssignmentRepository.listByStaff(
      staffId,
      workspaceId,
    );
    return assignments.map(toStaffAssignmentDetail);
  }
}
