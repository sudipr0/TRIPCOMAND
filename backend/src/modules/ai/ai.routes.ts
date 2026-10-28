import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { PERMISSION_CODES } from "@trailcomand/shared";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody } from "../../middleware/validation.js";
import { AIService } from "./ai.service.js";
import {
  draftSupplierEmailSchema,
  draftTravelerUpdateSchema,
  summarizeTripSchema,
} from "./ai.schemas.js";

/**
 * AI Operations Copilot routes.
 *
 * Every route requires a session, then tenancy (which proves active membership of
 * the workspace in the URL), then `trip:read`. The service is handed
 * `request.tenant.workspaceId`, never the URL parameter, so editing the URL
 * cannot widen the scope. Resource ownership is checked again inside the context
 * builders.
 *
 * The plugin also exposes a capability probe so the UI can disable the actions
 * instead of firing requests that are guaranteed to fail.
 */

interface WorkspaceParams {
  workspaceId: string;
}

/**
 * Per-route limiter, keyed by user + workspace. The global 200/min limiter is far
 * too generous for something that spends a metered provider quota, so AI routes
 * get their own smaller bucket. Returning the user id (not the IP) means one
 * noisy office member cannot lock out colleagues behind the same NAT.
 */
function aiRateLimitKey(request: FastifyRequest): string {
  const userId = request.user?.id ?? "anonymous";
  const workspaceId = request.tenant?.workspaceId ?? "no-workspace";
  return `ai:${workspaceId}:${userId}`;
}

const AI_RATE_LIMIT = {
  max: 10,
  timeWindow: "1 minute",
  keyGenerator: aiRateLimitKey,
} as const;

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);
  fastify.addHook(
    "preHandler",
    permissionMiddleware(PERMISSION_CODES.TRIP_READ),
  );

  /**
   * Capability probe. Cheap, no DB, no provider call. Safe to call on mount.
   */
  fastify.get<{ Params: WorkspaceParams }>(
    "/:workspaceId/ai/capability",
    async () => ({
      success: true,
      data: AIService.capability(),
    }),
  );

  fastify.post<{ Params: WorkspaceParams; Body: unknown }>(
    "/:workspaceId/ai/draft-traveler-update",
    {
      config: { rateLimit: AI_RATE_LIMIT },
      preHandler: [validateBody(draftTravelerUpdateSchema)],
    },
    async (request) => {
      const body = request.body as ReturnType<
        typeof draftTravelerUpdateSchema.parse
      >;
      const draft = await AIService.draftTravelerUpdate(
        request.tenant.workspaceId,
        {
          tripId: body.tripId,
          disruptionId: body.disruptionId,
          tone: body.tone,
        },
      );
      return { success: true, data: draft };
    },
  );

  fastify.post<{ Params: WorkspaceParams; Body: unknown }>(
    "/:workspaceId/ai/draft-supplier-email",
    {
      config: { rateLimit: AI_RATE_LIMIT },
      preHandler: [validateBody(draftSupplierEmailSchema)],
    },
    async (request) => {
      const body = request.body as ReturnType<typeof draftSupplierEmailSchema.parse>;
      const draft = await AIService.draftSupplierEmail(
        request.tenant.workspaceId,
        {
          tripId: body.tripId,
          supplierId: body.supplierId,
          messageContext: body.messageContext,
        },
      );
      return { success: true, data: draft };
    },
  );

  fastify.post<{ Params: WorkspaceParams; Body: unknown }>(
    "/:workspaceId/ai/summarize-trip",
    {
      config: { rateLimit: AI_RATE_LIMIT },
      preHandler: [validateBody(summarizeTripSchema)],
    },
    async (request) => {
      const body = request.body as ReturnType<typeof summarizeTripSchema.parse>;
      const draft = await AIService.summarizeTrip(request.tenant.workspaceId, {
        tripId: body.tripId,
      });
      return { success: true, data: draft };
    },
  );
};
