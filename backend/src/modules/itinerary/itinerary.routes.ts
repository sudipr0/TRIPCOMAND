import type { FastifyPluginAsync } from "fastify";
import { ItineraryService } from "./itinerary.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@trailcomand/shared";
import type { DayStatusValue } from "@trailcomand/shared";
import {
  createItineraryDaySchema,
  updateItineraryDaySchema,
  updateDayStatusSchema,
  reorderItineraryDaysSchema,
  populateFromTemplateSchema,
  publishItinerarySchema,
} from "./itinerary.schemas.js";

interface TripParams {
  workspaceId: string;
  tripId: string;
}

export const itineraryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // List itinerary days
  fastify.get<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/itinerary",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request) => {
      const days = await ItineraryService.listDays(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data: days };
    },
  );

  // Add a day
  fastify.post<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/itinerary",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(createItineraryDaySchema),
      ],
    },
    async (request, reply) => {
      const day = await ItineraryService.createDay(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: day });
    },
  );

  // Populate itinerary from a trek template
  fastify.post<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/itinerary/from-template",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(populateFromTemplateSchema),
      ],
    },
    async (request, reply) => {
      const days = await ItineraryService.populateFromTemplate(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        (request.body as { templateId: string }).templateId,
      );
      return reply.status(201).send({ success: true, data: days });
    },
  );

  // Reorder days (must be declared before /:dayId routes? No — POST paths are distinct)
  fastify.post<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/itinerary/reorder",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(reorderItineraryDaysSchema),
      ],
    },
    async (request) => {
      const days = await ItineraryService.reorderDays(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        (request.body as { items: { id: string; dayNumber: number }[] }).items,
      );
      return { success: true, data: days };
    },
  );

  // Publish the itinerary (snapshot + version)
  fastify.post<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/itinerary/publish",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_PUBLISH_ITINERARY),
        validateBody(publishItinerarySchema),
      ],
    },
    async (request) => {
      const version = await ItineraryService.publishItinerary(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        request.body as never,
      );
      return { success: true, data: version };
    },
  );

  // List itinerary versions
  fastify.get<{ Params: TripParams }>(
    "/:workspaceId/trips/:tripId/itinerary/versions",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request) => {
      const versions = await ItineraryService.listVersions(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data: versions };
    },
  );

  // Get a single itinerary version (with snapshot)
  fastify.get<{ Params: TripParams & { versionId: string } }>(
    "/:workspaceId/trips/:tripId/itinerary/versions/:versionId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request) => {
      const version = await ItineraryService.getVersion(
        request.tenant.workspaceId,
        request.params.tripId,
        request.params.versionId,
      );
      return { success: true, data: version };
    },
  );

  // Update a day's live timeline status.
  // Declared before PATCH /:dayId so "status" is never treated as a day id.
  fastify.patch<{ Params: TripParams & { dayId: string }; Body: { status: DayStatusValue } }>(
    "/:workspaceId/trips/:tripId/itinerary/:dayId/status",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(updateDayStatusSchema),
      ],
    },
    async (request) => {
      const day = await ItineraryService.updateDayStatus(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        request.params.dayId,
        request.body.status,
      );
      return { success: true, data: day };
    },
  );


  // Update a day
  fastify.patch<{ Params: TripParams & { dayId: string } }>(
    "/:workspaceId/trips/:tripId/itinerary/:dayId",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(updateItineraryDaySchema),
      ],
    },
    async (request) => {
      const day = await ItineraryService.updateDay(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        request.params.dayId,
        request.body as never,
      );
      return { success: true, data: day };
    },
  );

  // Delete a day
  fastify.delete<{ Params: TripParams & { dayId: string } }>(
    "/:workspaceId/trips/:tripId/itinerary/:dayId",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE)] },
    async (request) => {
      const result = await ItineraryService.deleteDay(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        request.params.dayId,
      );
      return { success: true, data: result };
    },
  );
};
