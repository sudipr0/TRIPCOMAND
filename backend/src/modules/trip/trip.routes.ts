import type { FastifyPluginAsync } from "fastify";
import { PERMISSION_CODES } from "@trailcomand/shared";

import { TripService } from "./trip.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { changeTripStatusSchema } from './trip.schemas.js';
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { createTripSchema, updateTripSchema } from './trip.schemas.js';
import { listTripsQuerySchema, assignTripSchema } from './trip.schemas.js';
import { validateBody, validateQuery } from "../../middleware/validation.js";

export const tripRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require auth + tenancy
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List trips
  fastify.get<{ Querystring: Record<string, unknown> }>(
    "/:workspaceId/trips",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_READ),
        validateQuery(listTripsQuerySchema),
      ],
    },
    async (request, reply) => {
      const result = await TripService.listTrips(
        request.tenant.workspaceId,
        request.query as never,
      );
      return { success: true, data: result };
    },
  );

  // Create trip
  fastify.post<{ Params: { workspaceId: string } }>(
    "/:workspaceId/trips",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_CREATE),
        validateBody(createTripSchema),
      ],
    },
    async (request, reply) => {
      const trip = await TripService.createTrip(
        request.tenant.workspaceId,
        request.user!.id,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: trip });
    },
  );

  // Get trip with travelers and itinerary
  fastify.get<{ Params: { workspaceId: string; tripId: string } }>(
    "/:workspaceId/trips/:tripId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request) => {
      const trip = await TripService.getTrip(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data: trip };
    },
  );

  // Get readiness (computed, never stored)
  fastify.get<{ Params: { workspaceId: string; tripId: string } }>(
    "/:workspaceId/trips/:tripId/readiness",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request) => {
      const readiness = await TripService.getReadiness(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data: readiness };
    },
  );

  // Update trip
  fastify.patch<{ Params: { workspaceId: string; tripId: string } }>(
    "/:workspaceId/trips/:tripId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(updateTripSchema),
      ],
    },
    async (request) => {
      const trip = await TripService.updateTrip(
        request.tenant.workspaceId,
        request.params.tripId,
        request.user!.id,
        request.body as never,
      );
      return { success: true, data: trip };
    },
  );

  // Change trip status (PLANNING -> READY -> IN_PROGRESS -> COMPLETED, CANCELLED anywhere)
  fastify.patch<{ Params: { workspaceId: string; tripId: string } }>(
    "/:workspaceId/trips/:tripId/status",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(changeTripStatusSchema),
      ],
    },
    async (request) => {
      const trip = await TripService.updateStatus(
        request.tenant.workspaceId,
        request.params.tripId,
        request.user!.id,
        (request.body as { status: string }).status,
      );
      return { success: true, data: trip };
    },
  );

  // Assign operations manager / lead guide
  fastify.patch<{ Params: { workspaceId: string; tripId: string } }>(
    "/:workspaceId/trips/:tripId/assign",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_ASSIGN),
        validateBody(assignTripSchema),
      ],
    },
    async (request) => {
      const trip = await TripService.assign(
        request.tenant.workspaceId,
        request.params.tripId,
        request.user!.id,
        request.body as never,
      );
      return { success: true, data: trip };
    },
  );

  // Delete trip (soft)
  fastify.delete<{ Params: { workspaceId: string; tripId: string } }>(
    "/:workspaceId/trips/:tripId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_DELETE)] },
    async (request) => {
      const result = await TripService.deleteTrip(
        request.tenant.workspaceId,
        request.params.tripId,
        request.user!.id,
      );
      return { success: true, data: result };
    },
  );
};
