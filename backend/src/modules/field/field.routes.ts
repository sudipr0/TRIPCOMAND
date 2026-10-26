import type { FastifyPluginAsync } from "fastify";
import { PERMISSION_CODES } from "@trailcomand/shared";

import { FieldService } from "./field.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import {
  createCheckInSchema,
  createFieldReportSchema,
  listFieldDataQuerySchema,
} from "./field.schemas.js";

interface TripParams {
  workspaceId: string;
  tripId: string;
}

export const fieldRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // Guide home: trips this account is assigned to.
  fastify.get<{ Params: { workspaceId: string } }>(
    "/:workspaceId/field/trips",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.TRIP_READ)] },
    async (request) => {
      const trips = await FieldService.listMyTrips(
        request.tenant.workspaceId,
        request.user!.id,
      );
      return { success: true, data: trips };
    },
  );

  // Send a check-in (offline-safe: idempotent on clientId).
  fastify.post<{ Params: TripParams; Body: Record<string, unknown> }>(
    "/:workspaceId/trips/:tripId/check-ins",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(createCheckInSchema),
      ],
    },
    async (request, reply) => {
      const checkIn = await FieldService.createCheckIn(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: checkIn });
    },
  );

  // File a field report (emergencies are flagged for immediate attention).
  fastify.post<{ Params: TripParams; Body: Record<string, unknown> }>(
    "/:workspaceId/trips/:tripId/reports",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_UPDATE),
        validateBody(createFieldReportSchema),
      ],
    },
    async (request, reply) => {
      const report = await FieldService.createReport(
        request.tenant.workspaceId,
        request.user!.id,
        request.params.tripId,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: report });
    },
  );

  // Office live view: both streams for one trip.
  fastify.get<{ Params: TripParams; Querystring: Record<string, unknown> }>(
    "/:workspaceId/trips/:tripId/field-data",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TRIP_READ),
        validateQuery(listFieldDataQuerySchema),
      ],
    },
    async (request) => {
      const data = await FieldService.listTripFieldData(
        request.tenant.workspaceId,
        request.params.tripId,
      );
      return { success: true, data };
    },
  );
};
