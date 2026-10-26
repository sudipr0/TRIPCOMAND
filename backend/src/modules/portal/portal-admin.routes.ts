import type { FastifyPluginAsync } from "fastify";
import { PERMISSION_CODES, createTripDocumentSchema } from "@trailcomand/shared";

import { PortalService } from "./portal.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody } from "../../middleware/validation.js";

interface TripParams {
  workspaceId: string;
  tripId: string;
}

interface TravelerParams extends TripParams {
  travelerId: string;
}

/**
 * Office-side portal administration. Standard session + tenancy auth; the
 * workspace always comes from request.tenant, never from the URL.
 */
export const portalAdminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // Issue (or rotate) a traveler's magic link.
  fastify.post<{ Params: TravelerParams }>(
    "/:workspaceId/trips/:tripId/travelers/:travelerId/portal-access",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE)] },
    async (request, reply) => {
      const link = await PortalService.generatePortalAccess(
        request.tenant.workspaceId,
        request.params.tripId,
        request.params.travelerId,
        { userId: request.user!.id },
      );
      return reply.status(201).send({ success: true, data: link });
    },
  );

  // Office files a document on a traveler's behalf.
  fastify.post<{ Params: TripParams; Body: Record<string, unknown> }>(
    "/:workspaceId/trips/:tripId/documents",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(createTripDocumentSchema),
      ],
    },
    async (request, reply) => {
      const document = await PortalService.createOfficeDocument(
        request.tenant.workspaceId,
        request.params.tripId,
        request.user!.id,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: document });
    },
  );

  // Every traveler's documents plus the state of their portal link.
  fastify.get<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/documents",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request) => {
      const documents = await PortalService.listTripDocuments(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data: documents };
    },
  );

  // Traveller help requests for this trip. They are inquiries at heart, but the
  // team watching the trip needs them in context.
  fastify.get<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/portal-help-requests",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request) => {
      const requests = await PortalService.listTripHelpRequests(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data: requests };
    },
  );
};
