import type { FastifyPluginAsync } from "fastify";
import { StaffAssignmentService } from "./staff-assignment.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@trailcomand/shared";
import {
  createStaffAssignmentSchema,
  updateStaffAssignmentSchema,
  listStaffAssignmentsQuerySchema,
  changeStaffAssignmentStatusSchema,
  checkAvailabilityQuerySchema,
} from "./staff-assignment.schemas.js";

export const staffAssignmentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List assignments (general / filtered by query)
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: Record<string, unknown>;
  }>(
    "/:workspaceId/staff-assignments",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_ASSIGNMENT_READ),
        validateQuery(listStaffAssignmentsQuerySchema),
      ],
    },
    async (request) => {
      const result = await StaffAssignmentService.listAssignments(
        request.tenant.workspaceId,
        request.query as never,
      );
      return { success: true, data: result };
    },
  );

  // Create assignment
  fastify.post<{
    Params: { workspaceId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/staff-assignments",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_ASSIGNMENT_CREATE),
        validateBody(createStaffAssignmentSchema),
      ],
    },
    async (request, reply) => {
      const assignment = await StaffAssignmentService.createAssignment(
        request.tenant.workspaceId,
        request.user!.id,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: assignment });
    },
  );

  // Availability check: GET /:workspaceId/availability/staff?staffId=...&startDate=...&endDate=...
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: Record<string, unknown>;
  }>(
    "/:workspaceId/availability/staff",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_ASSIGNMENT_READ),
        validateQuery(checkAvailabilityQuerySchema),
      ],
    },
    async (request) => {
      const result = await StaffAssignmentService.checkAvailability(
        request.tenant.workspaceId,
        request.query as never,
      );
      return { success: true, data: result };
    },
  );

  // List assignments for a specific trip
  fastify.get<{
    Params: { workspaceId: string; tripId: string };
  }>(
    "/:workspaceId/trips/:tripId/staff-assignments",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_ASSIGNMENT_READ),
      ],
    },
    async (request) => {
      const assignments = await StaffAssignmentService.listByTrip(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data: assignments };
    },
  );

  // List assignments for a specific staff member
  fastify.get<{
    Params: { workspaceId: string; staffId: string };
  }>(
    "/:workspaceId/staff/:staffId/assignments",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_ASSIGNMENT_READ),
      ],
    },
    async (request) => {
      const assignments = await StaffAssignmentService.listByStaff(
        request.tenant.workspaceId,
        request.params.staffId,
      );
      return { success: true, data: assignments };
    },
  );

  // Get single assignment
  fastify.get<{
    Params: { workspaceId: string; assignmentId: string };
  }>(
    "/:workspaceId/staff-assignments/:assignmentId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_ASSIGNMENT_READ),
      ],
    },
    async (request) => {
      const assignment = await StaffAssignmentService.getAssignment(
        request.tenant.workspaceId,
        request.params.assignmentId,
      );
      return { success: true, data: assignment };
    },
  );

  // Update assignment
  fastify.patch<{
    Params: { workspaceId: string; assignmentId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/staff-assignments/:assignmentId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_ASSIGNMENT_UPDATE),
        validateBody(updateStaffAssignmentSchema),
      ],
    },
    async (request) => {
      const assignment = await StaffAssignmentService.updateAssignment(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.assignmentId,
        request.body as never,
      );
      return { success: true, data: assignment };
    },
  );

  // Update status (e.g., CONFIRM, DECLINE, CANCEL)
  fastify.patch<{
    Params: { workspaceId: string; assignmentId: string };
    Body: { status: string; notes?: string };
  }>(
    "/:workspaceId/staff-assignments/:assignmentId/status",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_ASSIGNMENT_UPDATE),
        validateBody(changeStaffAssignmentStatusSchema),
      ],
    },
    async (request) => {
      const assignment = await StaffAssignmentService.updateStatus(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.assignmentId,
        request.body.status,
        request.body.notes,
      );
      return { success: true, data: assignment };
    },
  );

  // Delete assignment (soft delete)
  fastify.delete<{
    Params: { workspaceId: string; assignmentId: string };
  }>(
    "/:workspaceId/staff-assignments/:assignmentId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.STAFF_ASSIGNMENT_DELETE),
      ],
    },
    async (request) => {
      const result = await StaffAssignmentService.deleteAssignment(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.assignmentId,
      );
      return { success: true, data: result };
    },
  );
};
