import type { FastifyPluginAsync } from "fastify";
import { TripTravelerService } from "./trip-traveler.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@trailcomand/shared";
import {
  createTripTravelerSchema,
  updateTripTravelerSchema,
  bulkAddTravelersSchema,
} from "./trip-traveler.schemas.js";

interface TripParams {
  workspaceId: string;
  tripId: string;
}

export const tripTravelerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List travelers for a trip
  fastify.get<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/travelers",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request) => {
      const travelers = await TripTravelerService.listTravelers(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data: travelers };
    },
  );

  // Add a traveler
  fastify.post<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/travelers",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(createTripTravelerSchema),
      ],
    },
    async (request, reply) => {
      const traveler = await TripTravelerService.addTraveler(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: traveler });
    },
  );

  // Bulk add travelers
  fastify.post<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/travelers/bulk",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(bulkAddTravelersSchema),
      ],
    },
    async (request, reply) => {
      const result = await TripTravelerService.bulkAddTravelers(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        (request.body as { items: never[] }).items,
      );
      return reply.status(201).send({ success: true, data: result });
    },
  );

  // Get a traveler
  fastify.get<{ Params: TripParams & { travelerId: string } }>(
    "/:workspaceId/trips/:tripId/travelers/:travelerId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request) => {
      const traveler = await TripTravelerService.getTraveler(
        request.tenant.workspaceId,
        request.params.tripId,
        request.params.travelerId,
      );
      return { success: true, data: traveler };
    },
  );

  // Update a traveler
  fastify.patch<{ Params: TripParams & { travelerId: string } }>(
    "/:workspaceId/trips/:tripId/travelers/:travelerId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(updateTripTravelerSchema),
      ],
    },
    async (request) => {
      const traveler = await TripTravelerService.updateTraveler(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        request.params.travelerId,
        request.body as never,
      );
      return { success: true, data: traveler };
    },
  );

  // Delete a traveler
  fastify.delete<{ Params: TripParams & { travelerId: string } }>(
    "/:workspaceId/trips/:tripId/travelers/:travelerId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE)] },
    async (request) => {
      const result = await TripTravelerService.deleteTraveler(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        request.params.travelerId,
      );
      return { success: true, data: result };
    },
  );
};
