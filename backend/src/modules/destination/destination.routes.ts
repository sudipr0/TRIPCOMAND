import type { FastifyPluginAsync } from "fastify";
import { DestinationService } from "./destination.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@tripchange/shared";
import {
  createDestinationSchema,
  updateDestinationSchema,
  listDestinationsQuerySchema,
  type CreateDestinationInput,
  type UpdateDestinationInput,
  type ListDestinationsQuery,
} from "./destination.schemas.js";

export const destinationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List destinations in workspace
  fastify.get<{
    Params: { workspaceId: string };
    Querystring: ListDestinationsQuery;
  }>(
    "/:workspaceId/destinations",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.DESTINATION_READ),
        validateQuery(listDestinationsQuerySchema),
      ],
    },
    async (request, reply) => {
      const result = await DestinationService.listDestinations(
        request.tenant.workspaceId,
        request.query,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // Get a single destination
  fastify.get<{ Params: { workspaceId: string; id: string } }>(
    "/:workspaceId/destinations/:id",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.DESTINATION_READ)] },
    async (request, reply) => {
      const destination = await DestinationService.getDestination(
        request.tenant.workspaceId,
        request.params.id,
      );
      return reply.send({ success: true, data: destination });
    },
  );

  // Create destination
  fastify.post<{
    Params: { workspaceId: string };
    Body: CreateDestinationInput;
  }>(
    "/:workspaceId/destinations",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.DESTINATION_CREATE),
        validateBody(createDestinationSchema),
      ],
    },
    async (request, reply) => {
      const destination = await DestinationService.createDestination(
        request.tenant.workspaceId,
        request.user!.id,
        request.body,
      );
      return reply.status(201).send({ success: true, data: destination });
    },
  );

  // Update destination
  fastify.patch<{
    Params: { workspaceId: string; id: string };
    Body: UpdateDestinationInput;
  }>(
    "/:workspaceId/destinations/:id",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.DESTINATION_UPDATE),
        validateBody(updateDestinationSchema),
      ],
    },
    async (request, reply) => {
      const updated = await DestinationService.updateDestination(
        request.tenant.workspaceId,
        request.params.id,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: updated });
    },
  );

  // Soft delete destination
  fastify.delete<{ Params: { workspaceId: string; id: string } }>(
    "/:workspaceId/destinations/:id",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.DESTINATION_DELETE)] },
    async (request, reply) => {
      const result = await DestinationService.deleteDestination(
        request.tenant.workspaceId,
        request.params.id,
        request.user!.id,
      );
      return reply.send({ success: true, data: result });
    },
  );
};
