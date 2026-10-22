import type { FastifyPluginAsync } from "fastify";
import { ResourceAssignmentService } from "./resource-assignment.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@tripchange/shared";
import {
  createResourceAssignmentSchema,
  updateResourceAssignmentSchema,
  listResourceAssignmentsQuerySchema,
  changeResourceAssignmentStatusSchema,
  checkAvailabilityQuerySchema,
} from "./resource-assignment.schemas.js";

export const resourceAssignmentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List assignments (general / filtered by query)
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: Record<string, unknown>;
  }>(
    "/:workspaceId/resource-assignments",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.RESOURCE_READ),
        validateQuery(listResourceAssignmentsQuerySchema),
      ],
    },
    async (request) => {
      const result = await ResourceAssignmentService.listAssignments(
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
    "/:workspaceId/resource-assignments",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.RESOURCE_UPDATE),
        validateBody(createResourceAssignmentSchema),
      ],
    },
    async (request, reply) => {
      const assignment = await ResourceAssignmentService.createAssignment(
        request.tenant.workspaceId,
        request.user!.id,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: assignment });
    },
  );

  // Check availability
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: Record<string, unknown>;
  }>(
    "/:workspaceId/availability/resources",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.RESOURCE_READ),
        validateQuery(checkAvailabilityQuerySchema),
      ],
    },
    async (request) => {
      const result = await ResourceAssignmentService.checkAvailability(
        request.tenant.workspaceId,
        request.query as never,
      );
      return { success: true, data: result };
    },
  );

  // List assignments for a trip
  fastify.get<{
    Params: { workspaceId: string; tripId: string };
  }>(
    "/:workspaceId/trips/:tripId/resource-assignments",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.RESOURCE_READ)],
    },
    async (request) => {
      const assignments = await ResourceAssignmentService.listByTrip(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data: assignments };
    },
  );

  // List assignments for a resource
  fastify.get<{
    Params: { workspaceId: string; resourceId: string };
  }>(
    "/:workspaceId/resources/:resourceId/assignments",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.RESOURCE_READ)],
    },
    async (request) => {
      const assignments = await ResourceAssignmentService.listByResource(
        request.tenant.workspaceId,
        request.params.resourceId,
      );
      return { success: true, data: assignments };
    },
  );

  // Get single assignment
  fastify.get<{
    Params: { workspaceId: string; assignmentId: string };
  }>(
    "/:workspaceId/resource-assignments/:assignmentId",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.RESOURCE_READ)],
    },
    async (request) => {
      const assignment = await ResourceAssignmentService.getAssignment(
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
    "/:workspaceId/resource-assignments/:assignmentId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.RESOURCE_UPDATE),
        validateBody(updateResourceAssignmentSchema),
      ],
    },
    async (request) => {
      const assignment = await ResourceAssignmentService.updateAssignment(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.assignmentId,
        request.body as never,
      );
      return { success: true, data: assignment };
    },
  );

  // Update assignment status
  fastify.patch<{
    Params: { workspaceId: string; assignmentId: string };
    Body: { status: string };
  }>(
    "/:workspaceId/resource-assignments/:assignmentId/status",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.RESOURCE_UPDATE),
        validateBody(changeResourceAssignmentStatusSchema),
      ],
    },
    async (request) => {
      const assignment = await ResourceAssignmentService.updateStatus(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.assignmentId,
        request.body.status,
      );
      return { success: true, data: assignment };
    },
  );

  // Delete assignment
  fastify.delete<{
    Params: { workspaceId: string; assignmentId: string };
  }>(
    "/:workspaceId/resource-assignments/:assignmentId",
    {
      preHandler: [permissionMiddleware(PERMISSION_CODES.RESOURCE_UPDATE)],
    },
    async (request) => {
      const result = await ResourceAssignmentService.deleteAssignment(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.assignmentId,
      );
      return { success: true, data: result };
    },
  );
};
