import type { FastifyPluginAsync } from "fastify";
import { PERMISSION_CODES } from "@trailcomand/shared";

import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateBody, validateQuery } from "../../middleware/validation.js";
import { DisruptionService } from "./disruption.service.js";
import {
  completeTaskSchema,
  createDisruptionSchema,
  createRecoveryPlanSchema,
  listDisruptionsQuerySchema,
} from "./disruption.schemas.js";

export const disruptionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);

  fastify.get<{
    Params: { workspaceId: string };
    Querystring: Record<string, unknown>;
  }>(
    "/:workspaceId/disruptions",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.INCIDENT_READ),
        validateQuery(listDisruptionsQuerySchema),
      ],
    },
    async (request) => ({
      success: true,
      data: await DisruptionService.listDisruptions(
        request.tenant.workspaceId,
        request.query as never,
      ),
    }),
  );

  fastify.post<{
    Params: { workspaceId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/disruptions",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.INCIDENT_CREATE),
        validateBody(createDisruptionSchema),
      ],
    },
    async (request, reply) => {
      const disruption = await DisruptionService.createDisruption(
        request.tenant.workspaceId,
        request.user!.id,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: disruption });
    },
  );

  fastify.get<{ Params: { workspaceId: string; id: string } }>(
    "/:workspaceId/disruptions/:id",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.INCIDENT_READ)] },
    async (request) => ({
      success: true,
      data: await DisruptionService.getDisruptionDetails(
        request.tenant.workspaceId,
        request.params.id,
      ),
    }),
  );

  fastify.post<{
    Params: { workspaceId: string; id: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/disruptions/:id/plan",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.RECOVERY_CREATE),
        validateBody(createRecoveryPlanSchema),
      ],
    },
    async (request, reply) => {
      const disruption = await DisruptionService.createRecoveryPlan(
        request.tenant.workspaceId,
        request.params.id,
        request.user!.id,
        request.body as never,
      );
      return reply.status(201).send({ success: true, data: disruption });
    },
  );

  fastify.post<{ Params: { workspaceId: string; id: string } }>(
    "/:workspaceId/disruptions/:id/approve",
    { preHandler: [permissionMiddleware(PERMISSION_CODES.RECOVERY_APPROVE)] },
    async (request) => ({
      success: true,
      data: await DisruptionService.approvePlan(
        request.tenant.workspaceId,
        request.params.id,
        request.user!.id,
      ),
    }),
  );

  fastify.patch<{
    Params: { workspaceId: string; taskId: string };
    Body: Record<string, unknown>;
  }>(
    "/:workspaceId/tasks/:taskId/complete",
    {
      preHandler: [
        permissionMiddleware(PERMISSION_CODES.TASK_EXECUTE),
        validateBody(completeTaskSchema),
      ],
    },
    async (request) => ({
      success: true,
      data: await DisruptionService.completeTask(
        request.tenant.workspaceId,
        request.params.taskId,
        request.user!.id,
        (request.body as { evidenceUrl?: string | null }).evidenceUrl,
      ),
    }),
  );
};
