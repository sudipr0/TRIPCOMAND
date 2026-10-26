import type { FastifyPluginAsync } from "fastify";
import { AuditService } from "./audit.service.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenancyMiddleware } from "../../middleware/tenancy.js";
import { permissionMiddleware } from "../../middleware/permission.js";
import { validateQuery } from "../../middleware/validation.js";
import { PERMISSION_CODES } from "@trailcomand/shared";
import {
  queryAuditLogsSchema,
  type QueryAuditLogsInput,
} from "./audit.schemas.js";

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authMiddleware);
  fastify.addHook("preHandler", tenancyMiddleware);
  fastify.addHook(
    "preHandler",
    permissionMiddleware(PERMISSION_CODES.AUDIT_READ),
  );

  fastify.get<{
    Params: { workspaceId: string };
    Querystring: QueryAuditLogsInput;
  }>(
    "/:workspaceId/audit-logs",
    { preHandler: [validateQuery(queryAuditLogsSchema)] },
    async (request, reply) => {
      const data = await AuditService.queryLogs(
        request.tenant.workspaceId,
        request.query,
      );
      return reply.send({ success: true, data });
    },
  );
};
