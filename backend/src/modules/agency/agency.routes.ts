import type { FastifyPluginAsync } from "fastify";
import { AgencyService } from "./agency.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@trailcomand/shared";
import {
  updateAgencyProfileSchema,
  updateAgencySettingsSchema,
  type UpdateAgencyProfileInput,
  type UpdateAgencySettingsInput,
} from "./agency.schemas.js";

export const agencyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  // Get agency profile for workspace
  fastify.get<{ Params: { workspaceId: string } }>(
    "/:workspaceId/agency/profile",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.AGENCY_READ)] },
    async (request, reply) => {
      const profile = await AgencyService.getProfile(
        request.tenant.workspaceId,
      );
      return reply.send({ success: true, data: profile });
    },
  );

  // Update agency profile
  fastify.patch<{
    Params: { workspaceId: string };
    Body: UpdateAgencyProfileInput;
  }>(
    "/:workspaceId/agency/profile",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.AGENCY_UPDATE),
        validateBody(updateAgencyProfileSchema),
      ],
    },
    async (request, reply) => {
      const updated = await AgencyService.updateProfile(
        request.tenant.workspaceId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: updated });
    },
  );

  // Update agency settings
  fastify.patch<{
    Params: { workspaceId: string };
    Body: UpdateAgencySettingsInput;
  }>(
    "/:workspaceId/agency/settings",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.AGENCY_UPDATE),
        validateBody(updateAgencySettingsSchema),
      ],
    },
    async (request, reply) => {
      const updated = await AgencyService.updateSettings(
        request.tenant.workspaceId,
        request.user!.id,
        request.body,
      );
      return reply.send({ success: true, data: updated });
    },
  );
};
